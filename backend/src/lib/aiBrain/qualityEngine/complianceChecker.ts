export class ComplianceChecker {
  static verifyConsentDetails(formConfig: any): boolean {
    const isMedical = formConfig.title.toLowerCase().includes("medical") || formConfig.title.toLowerCase().includes("hospital");
    if (!isMedical) return true;

    // Checks if patient signature is attached
    const questions = formConfig.questions || [];
    return questions.some((q: any) => q.type === 'signature');
  }
}
