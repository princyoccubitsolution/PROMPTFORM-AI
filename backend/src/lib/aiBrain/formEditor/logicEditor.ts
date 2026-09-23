export class LogicEditor {
  static removeOrphanedLogic(questions: any[]): any[] {
    const questionLabels = new Set(questions.map(q => q.label.toLowerCase()));
    
    return questions.map(q => {
      if (q.logic && q.logic.target_question_id) {
        const target = q.logic.target_question_id.toLowerCase();
        if (!questionLabels.has(target)) {
          delete q.logic; // Clear orphaned logic pointing to missing target
        }
      }
      return q;
    });
  }
}
