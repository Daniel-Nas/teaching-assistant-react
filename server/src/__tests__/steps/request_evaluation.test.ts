import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import { app } from '../../server';

const feature = loadFeature('./__tests__/features/selfEvaluation.feature');

let classId: string;
let response: request.Response;

defineFeature(feature, test => {
  // --- CENÁRIO 1 ---
  test('Enviando solicitação autoavaliação para um aluno com sucesso', ({ given, when, then, and }) => {

    given(/^o sistema possui a turma "(.*)" com o aluno de CPF "(.*)" matriculado$/, async (turma, cpf) => {
        const cleanCPF = cpf.replace(/[^\d]/g, '');

        // 1. Cria Aluno
        await request(app).post('/api/students').send({
          name: "Aluno Teste",
          cpf: cleanCPF,
          email: "aluno@teste.com"
        });

        // 2. Cria Turma
        const classRes = await request(app).post('/api/classes').send({
          topic: `Turma ${turma}`,
          semester: 1,
          year: 2025
        });
        classId = classRes.body.id;

        // 3. Matricula
        await request(app)
          .post(`/api/classes/${classId}/enroll`)
          .send({ studentCPF: cleanCPF });
    });

    when(/^eu solicito o envio de autoavaliação da meta "(.*)" para o aluno "(.*)" da turma "(.*)"$/, async (goal, cpf, turma) => {
        const cleanCPF = cpf.replace(/[^\d]/g, '');
        response = await request(app)
          .post(`/api/classes/${classId}/enrollments/${cleanCPF}/requestSelfEvaluation/${goal}`)
          .send();
    });

    // CORREÇÃO AQUI: Regex que aceita "um status de sucesso" OU "o status" e ignora espaços no fim (\s*)
    then(/^o sistema deve retornar (?:um status de sucesso|o status) "(.*)"\s*$/, (status) => {
        expect(response.status).toBe(Number(status));
    });

    and(/^a mensagem de resposta deve indicar "(.*)"$/, (msg) => {
        expect(response.body.message).toBe(msg);
    });
  });

  // --- CENÁRIO 2 ---
  test('Enviando solicitação autoavaliação para um aluno que já respondeu a autoavaliação', ({ given, when, then, and }) => {
    let clearCPF = '';
    // Regex ajustado para pegar Turma, CPF e Meta
    given(/^na turma "(.*)" existe um aluno de CPF "(.*)" que já completou a autoavaliação da meta "(.*)"$/, async (turma, cpf, meta) => {
      clearCPF = cpf.replace(/[^\d]/g, ''); // Limpa e guarda o CPF
      
      // 1. Cria o aluno
      await request(app).post('/api/students').send({
        name: "Aluno Já Respondeu",
        cpf: clearCPF,
        email: "respondido@teste.com"
      });

      // 2. Cria a turma
      const classRes = await request(app).post('/api/classes').send({
        topic: `Turma ${turma}`,
        semester: 2,
        year: 2024
      });
      classId = classRes.body.id; 

      // 3. Matricula
      await request(app).post(`/api/classes/${classId}/enroll`).send({
        studentCPF: clearCPF
      });

      // 4. PREENCHE a autoavaliação (Simula que já existe)
      await request(app)
        .put(`/api/classes/${classId}/enrollments/${clearCPF}/selfEvaluation/${meta}`)
        .send({ goal: meta, grade: "MA" }); 
    });

    when(/^eu solicito o envio de autoavaliação da meta "(.*)" para este aluno$/, async (goal) => {
      response = await request(app)
        .post(`/api/classes/${classId}/enrollments/${clearCPF}/requestSelfEvaluation/${goal}`)
        .send();
    });

    then(/^o sistema deve retornar o status "(.*)"$/, (status) => {
      expect(response.status).toBe(Number(status));
    });

    and(/^a resposta deve indicar "(.*)"$/, (msg) => {
        const mensagemLimpa = response.body.message.replace(/'/g, "");
        const expectativaLimpa = msg.replace(/'/g, "");
        expect(mensagemLimpa).toMatch(new RegExp(expectativaLimpa, 'i'));
    });
  });

  // --- CENÁRIO 3 ---
  test('Enviando Email para aluno não cadastrado na turma', ({ given, when, then, and }) => {
    
    // Agora o Given pega o nome da turma (ex: "b1")
    given(/^existe uma turma "(.*)" cadastrada no sistema$/, async (turma) => {
      const classRes = await request(app).post('/api/classes').send({
        topic: `Turma ${turma}`,
        semester: 1,
        year: 2025
      });
      classId = classRes.body.id;
    });

    // When ajustado para pegar o CPF específico
    when(/^eu tento solicitar autoavaliação para um CPF "(.*)" não matriculado nessa turma$/, async (cpfInvalido) => {
      // Usa o ID da turma criada no passo anterior e o CPF do cenário
      response = await request(app)
        .post(`/api/classes/${classId}/enrollments/${cpfInvalido}/requestSelfEvaluation/Requirements`)
        .send();
    });

    then(/^o sistema deve retornar o status "(.*)"$/, (status) => {
      expect(response.status).toBe(Number(status));
    });

    // Ajustado para casar com: 'a resposta deve conter o "Student not enrolled"'
    // (Note que removemos a palavra "erro" do regex para bater com o seu cenário)
    and(/^a resposta deve conter o "(.*)"$/, (msgEsperada) => {
      const msg = response.body.error || response.body.message;
      // RegExp case insensitive ('i') e flexível para garantir o match
      expect(msg).toMatch(new RegExp(msgEsperada, 'i'));
    });
  });

});