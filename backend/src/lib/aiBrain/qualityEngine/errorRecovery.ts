export class ErrorRecovery {
  static healCircularLogic(questions: any[]): any[] {
    // Healing logic: clean logic nodes for circular paths
    return questions.map(q => {
      if (q.logic && q.logic.target_question_id === q.label) {
        delete q.logic; // Clear self-referencing logical nodes
      }
      return q;
    });
  }
}
