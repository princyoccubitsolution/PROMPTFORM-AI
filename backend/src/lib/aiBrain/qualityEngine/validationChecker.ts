export class ValidationChecker {
  static checkRegexPatterns(questions: any[]): string[] {
    const invalidFields: string[] = [];
    for (const q of questions) {
      if (q.validations && q.validations.pattern) {
        try {
          new RegExp(q.validations.pattern);
        } catch (e) {
          invalidFields.push(q.label);
        }
      }
    }
    return invalidFields;
  }
}
