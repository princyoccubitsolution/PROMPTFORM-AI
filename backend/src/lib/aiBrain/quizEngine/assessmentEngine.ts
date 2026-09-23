export class AssessmentEngine {
  static getScoringModel(domain: string): 'academic' | 'compliance' | 'satisfaction' | 'standard' {
    if (domain === 'quiz') return 'academic';
    if (domain === 'complaint' || domain === 'medical') return 'compliance';
    if (domain === 'survey') return 'satisfaction';
    return 'standard';
  }
}
