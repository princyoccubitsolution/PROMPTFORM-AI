export class UxChecker {
  static checkUXIssues(formConfig: any): string[] {
    const issues: string[] = [];

    // Empty placeholder details checks
    const questions = formConfig.questions || [];
    for (const q of questions) {
      if (!q.placeholder || !q.placeholder.trim()) {
        issues.push(`Field '${q.label}' is missing placeholder help guides.`);
      }
    }

    return issues;
  }
}
