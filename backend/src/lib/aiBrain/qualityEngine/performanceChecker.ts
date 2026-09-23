export class PerformanceChecker {
  static verifyFieldCountLimits(formConfig: any): boolean {
    const questions = formConfig.questions || [];
    return questions.length <= 30; // Limit to 30 fields to prevent canvas lag
  }
}
