import { IntentContext } from './intentDetector';

export type FormDomain = 'quiz' | 'survey' | 'rsvp' | 'job' | 'contact' | 'medical' | 'complaint' | 'invoice' | 'general';

export class DomainDetector {
  static detect(context: IntentContext, documentContext?: string): FormDomain {
    const normalized = context.normalizedPrompt.toLowerCase();
    if (
      normalized.includes("quiz") || 
      normalized.includes("exam") || 
      normalized.includes("test") ||
      normalized.includes("question") ||
      normalized.includes("answer key") ||
      normalized.includes("explanation") ||
      normalized.includes("syllabus") ||
      normalized.includes("mcq") ||
      normalized.includes("assignment") ||
      normalized.includes("paper") ||
      normalized.includes("marks") ||
      normalized.includes("score") ||
      (documentContext && documentContext.trim().length > 10 && !normalized.includes("survey") && !normalized.includes("medical") && !normalized.includes("job") && !normalized.includes("hospital"))
    ) {
      return 'quiz';
    }
    if (normalized.includes("survey") || normalized.includes("feedback") || normalized.includes("review") || normalized.includes("satisfaction") || normalized.includes("evaluation")) {
      return 'survey';
    }
    if (normalized.includes("rsvp") || normalized.includes("event") || normalized.includes("wedding")) {
      return 'rsvp';
    }
    if (normalized.includes("job") || normalized.includes("application") || normalized.includes("career")) {
      return 'job';
    }
    if (normalized.includes("contact") || normalized.includes("lead")) {
      return 'contact';
    }
    if (normalized.includes("surgery") || normalized.includes("medical") || normalized.includes("doctor") || normalized.includes("patient")) {
      return 'medical';
    }
    if (normalized.includes("complaint") || normalized.includes("society") || normalized.includes("issue")) {
      return 'complaint';
    }
    if (normalized.includes("invoice") || normalized.includes("bill") || normalized.includes("quotation") || normalized.includes("payment")) {
      return 'invoice';
    }
    return 'general';
  }
}
