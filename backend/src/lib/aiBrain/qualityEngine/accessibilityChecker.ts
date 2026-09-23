export class AccessibilityChecker {
  static checkAriaLabels(questions: any[]): string[] {
    // Collects fields missing WCAG aria indicators
    return questions
      .filter(q => !q.accessibilityLabel)
      .map(q => q.label);
  }
}
