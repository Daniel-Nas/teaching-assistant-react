import { Student } from './Student';
import { Evaluation, Grade } from './Evaluation';

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  private selfEvaluations: Evaluation[];
  // Para controle de pedido de autoavaliação
  private selfEvaluationRequested: boolean = false;
  private selfEvaluationRequestDate?: string;
  private oneTimeSchedule: { goal: string, executeAt: number } | null = null;
  // Média do estudante antes da prova final
  private mediaPreFinal: number | null;
  // Média do estudante depois da final
  private mediaPosFinal: number | null;
  private reprovadoPorFalta: Boolean;

  constructor(student: Student, evaluations: Evaluation[] = [], selfEvaluations: Evaluation[] = [], mediaPreFinal: number | null = null, mediaPosFinal: number | null = null, reprovadoPorFalta: Boolean = false) {
    this.student = student;
    this.evaluations = evaluations;
    this.selfEvaluations = selfEvaluations;
    this.mediaPreFinal = mediaPreFinal;
    this.mediaPosFinal = mediaPosFinal;
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  // Get student
  getStudent(): Student {
    return this.student;
  }

  // Calcula a média do estudante antes da prova final
  calculateMediaPreFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  // Calcula a média do estudante depois da prova final
  calculateMediaPosFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  // Get media do estudante antes da prova final
  getMediaPreFinal(): number | null{
    return this.mediaPreFinal;
  }

  // Set media do estudante antes da prova final
  setMediaPreFinal(mediaPreFinal: number){
    this.mediaPreFinal = mediaPreFinal;
  }

  // Get média do estudante depois da final
  getMediaPosFinal(): number | null{
    return this.mediaPosFinal;
  }

  // Set média do estudante depois da final
  setMediaPosFinal(mediaPosFinal: number){
    this.mediaPosFinal = mediaPosFinal;
  }

  // Get reprovado por falta 
  getReprovadoPorFalta(): Boolean {
    return this.reprovadoPorFalta;
  }
  
  // Set reprovado por falta
  setReprovadoPorFalta(reprovadoPorFalta: Boolean){
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  private clone(list: Evaluation[]): Evaluation[] {
    return [...list];
  }

  // Add or update an evaluation
  private addOrUpdateIn(list: Evaluation[], goal: string, grade: Grade): void {
    const existingIndex = list.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      list[existingIndex].setGrade(grade);
    } else {
      list.push(new Evaluation(goal, grade));
    }
  }

  // Remove an evaluation
  private removeFrom(list: Evaluation[], goal: string): boolean {
    const existingIndex = list.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      return true;
    }
    return false;
  }

  private findIn(list: Evaluation[], goal: string): Evaluation | undefined {
    return list.find(evaluation => evaluation.getGoal() === goal);
  }

  getEvaluations(): Evaluation[] {
    return this.clone(this.evaluations); // Return copy to prevent external modification
  }

  getSelfEvaluations(): Evaluation[] {
    return this.clone(this.selfEvaluations); // Return copy to prevent external modification
  }

  // Add or update an evaluation
  addOrUpdateEvaluation(goal: string, grade: Grade): void {
    this.addOrUpdateIn(this.evaluations, goal, grade);
  }
  
  // Add or update a self-evaluation
  addOrUpdateSelfEvaluation(goal: string, grade: Grade): void {
    this.addOrUpdateIn(this.selfEvaluations, goal, grade);
  }

  // Remove an evaluation
  removeEvaluation(goal: string): boolean {
    return this.removeFrom(this.evaluations, goal);
  }

  // Remove a self-evaluation
  removeSelfEvaluation(goal: string): boolean {
    return this.removeFrom(this.selfEvaluations, goal);
  }
  
  // Get evaluation for a specific goal
  getEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.findIn(this.evaluations, goal);
  }

  // Get self-evaluation for a specific goal
  getSelfEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.findIn(this.selfEvaluations, goal);
  }

  // Merge evaluations from another enrollment
  mergeEvaluationsFrom(other: Enrollment): void {
    other.getEvaluations().forEach(evaluation => {
      this.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
    });
  }
  // Merge self-evaluations from another enrollment
  mergeSelfEvaluationsFrom(other: Enrollment): void {
    other.getSelfEvaluations().forEach(selfEvaluation => {
      this.addOrUpdateSelfEvaluation(selfEvaluation.getGoal(), selfEvaluation.getGrade());
    });
  }

// Método para AGENDAR (Chamado pela Rota)
  public scheduleOneTimeReminder(goal: string, hoursFromNow: number) {
      const futureDate = Date.now() + (hoursFromNow * 60 * 60 * 1000);
      this.oneTimeSchedule = {
          goal: goal,
          executeAt: futureDate
      };
  }

  // Método para VERIFICAR e EXECUTAR o agendamento (Chamado pelo Scheduler)
  public checkAndExecuteOneTime(now: number): string | null {
    // 1. Se não tem nada agendado, sai.
    if (!this.oneTimeSchedule) return null;
    // 2. Se ainda não chegou a hora, sai.
    if (now < this.oneTimeSchedule.executeAt) return null;
    // 3. Chegou a hora! Verifica se o aluno já fez a tarefa nesse meio tempo.
    const goal = this.oneTimeSchedule.goal;
    const alreadyDone = this.getSelfEvaluationForGoal(goal);
    // 4. Limpa o agendamento (Regra: Envia uma vez e para)
    this.oneTimeSchedule = null;
    // 5. Se o aluno já fez, não retornamos nada (cancela o envio)
    if (alreadyDone) return null;
    // 6. Se não fez, retorna a meta para o servidor enviar o e-mail
    return goal;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      student: this.student.toJSON(),
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON()),
      selfEvaluations: this.selfEvaluations.map(selfEvaluation => selfEvaluation.toJSON()),
      selfEvaluationRequested: this.selfEvaluationRequested,
      selfEvaluationRequestDate: this.selfEvaluationRequestDate,
      oneTimeSchedule: this.oneTimeSchedule,
      mediaPreFinal: this.mediaPreFinal,
      mediaPosFinal: this.mediaPosFinal,
      reprovadoPorFalta: this.reprovadoPorFalta
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: any, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];

    const selfEvaluations = data.selfEvaluations
      ? data.selfEvaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];

    const enrollment = new Enrollment(
      student,
      evaluations,
      selfEvaluations,
      data.mediaPreFinal ?? null,
      data.mediaPosFinal ?? null,
      data.reprovadoPorFalta ?? false
    );

    enrollment.selfEvaluationRequested = data.selfEvaluationRequested ?? false;
    enrollment.selfEvaluationRequestDate = data.selfEvaluationRequestDate;
    enrollment.oneTimeSchedule = data.oneTimeSchedule || null;

    return enrollment;
  }

}

export default Enrollment;