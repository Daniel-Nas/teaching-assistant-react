Feature: Solicitação de Autoavaliação

  Scenario: Enviando solicitação autoavaliação para um aluno com sucesso
    Given o sistema possui a turma "c1" com o aluno de CPF "12345678909" matriculado
    When eu solicito o envio de autoavaliação da meta "Requirements" para o aluno "12345678909" da turma "c1"
    Then o sistema deve retornar um status de sucesso "200"
    And a mensagem de resposta deve indicar "Request created"
  
  Scenario: Enviando solicitação autoavaliação para um aluno que já respondeu a autoavaliação
    Given na turma "a1" existe um aluno de CPF "18293812399" que já completou a autoavaliação da meta "Design"
    When eu solicito o envio de autoavaliação da meta "Design" para este aluno
    Then o sistema deve retornar o status "422"
    And a resposta deve indicar "Student already filled goal Design"

  Scenario: Enviando Email para aluno não cadastrado na turma
    Given existe uma turma "b1" cadastrada no sistema
    When eu tento solicitar autoavaliação para um CPF "99988999999" não matriculado nessa turma
    Then o sistema deve retornar o status "404"
    And a resposta deve conter o "Student not enrolled"