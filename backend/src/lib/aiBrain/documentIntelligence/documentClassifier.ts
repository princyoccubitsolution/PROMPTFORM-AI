export class DocumentClassifier {
  static classify(rawText: string): 'medical' | 'invoice' | 'job' | 'general' {
    const text = rawText.toLowerCase();
    if (text.includes("patient") || text.includes("hospital") || text.includes("medical")) {
      return 'medical';
    }
    if (text.includes("invoice") || text.includes("receipt") || text.includes("bill")) {
      return 'invoice';
    }
    if (text.includes("job") || text.includes("resume") || text.includes("career")) {
      return 'job';
    }
    return 'general';
  }
}
