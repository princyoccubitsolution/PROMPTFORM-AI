export class DuplicateChecker {
  static checkDuplicates(questions: any[]): string[] {
    const labels = new Set<string>();
    const duplicates: string[] = [];

    for (const q of questions) {
      if (labels.has(q.label)) {
        duplicates.push(q.label);
      } else {
        labels.add(q.label);
      }
    }

    return duplicates;
  }
}
