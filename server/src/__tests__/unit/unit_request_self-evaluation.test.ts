import { jest } from "@jest/globals";
import Enrollment from "../../../src/models/Enrollment";
import { Student } from "../../../src/models/Student";
import { Evaluation } from "../../../src/models/Evaluation";

// Helper para criar Enrollment válido
function makeEnrollment() {
  const student = new Student("Aluno Teste", "12345678900", "a@b.com");
  return new Enrollment(student);
}

describe("Enrollment — One-Time Reminder Scheduler", () => {

  test("agenda corretamente e não executa antes do tempo", () => {
    const e = makeEnrollment();
    // agendaando para 2 horas no futuro
    e.scheduleOneTimeReminder("Refactoring", 2);

    const now = Date.now() + 1000; // 1 segundo depois do agendamento
    const result = e.checkAndExecuteOneTime(now);

    expect(result).toBeNull();
  });

  test("executa no horário certo quando não existe self-evaluation", () => {
    const e = makeEnrollment();

    // agenda para 1 segundo no futuro (0.0003 h)
    e.scheduleOneTimeReminder("Tests", 0.0003);

    // mock: aluno NÃO fez ainda
    jest.spyOn(e as any, "getSelfEvaluationForGoal").mockReturnValue(undefined);

    const now = Date.now() + 5000; // 5s depois do agendamento

    const result = e.checkAndExecuteOneTime(now);

    expect(result).toBe("Tests");
  });

  test("limpa o agendamento após executar (one-shot)", () => {
    const e = makeEnrollment();
    e.scheduleOneTimeReminder("Design", 0.0003);

    jest.spyOn(e as any, "getSelfEvaluationForGoal").mockReturnValue(undefined);

    const now = Date.now() + 5000;

    expect(e.checkAndExecuteOneTime(now)).toBe("Design");

    // segunda chamada NÃO deve retornar nada
    expect(e.checkAndExecuteOneTime(now)).toBeNull();
  });

  test("não executa se o aluno já fez a meta", () => {
    const e = makeEnrollment();
    e.scheduleOneTimeReminder("Requirements", 0.0003);

    // mock de self evaluation EXISTENTE
    jest
      .spyOn(e as any, "getSelfEvaluationForGoal")
      .mockReturnValue(new Evaluation("Requirements", "MA"));

    const now = Date.now() + 5000;

    const result = e.checkAndExecuteOneTime(now);

    expect(result).toBeNull();
  });

  test("substitui agendamentos anteriores corretamente", () => {
    const e = makeEnrollment();

    e.scheduleOneTimeReminder("Refactoring", 10);

    e.scheduleOneTimeReminder("Tests", 0.0003);

    jest.spyOn(e as any, "getSelfEvaluationForGoal").mockReturnValue(undefined);

    const now = Date.now() + 5000;

    const result = e.checkAndExecuteOneTime(now);

    expect(result).toBe("Tests");
  });

  test("não executa se não existir agendamento", () => {
    const e = makeEnrollment();

    const result = e.checkAndExecuteOneTime(Date.now() + 5000);

    expect(result).toBeNull();
  });

});


