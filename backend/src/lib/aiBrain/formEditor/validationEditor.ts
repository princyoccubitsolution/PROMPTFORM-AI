export class ValidationEditor {
  static attachPattern(questions: any[], labelPattern: string, regex: string, message: string): any[] {
    return questions.map(q => {
      if (q.label.toLowerCase().includes(labelPattern.toLowerCase())) {
        q.validations = q.validations || {};
        q.validations.pattern = regex;
        q.validations.message = message;
      }
      return q;
    });
  }
}
