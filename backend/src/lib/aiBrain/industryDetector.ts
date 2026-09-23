import { FormDomain } from './domainDetector';

export class IndustryDetector {
  static detect(domain: FormDomain, normalizedPrompt: string): string {
    switch (domain) {
      case 'quiz': return 'Education';
      case 'rsvp': return 'Events';
      case 'job': return 'Human Resources';
      case 'contact': return 'Marketing / Sales';
      case 'medical': return 'Healthcare';
      case 'complaint': return 'Public Service / Real Estate';
      case 'invoice': return 'Finance';
      case 'survey':
        if (normalizedPrompt.includes("restaurant") || normalizedPrompt.includes("food") || normalizedPrompt.includes("meal")) {
          return 'Food & Beverage';
        }
        if (normalizedPrompt.includes("hotel") || normalizedPrompt.includes("stay") || normalizedPrompt.includes("room")) {
          return 'Hospitality';
        }
        return 'General Customer Service';
      default:
        return 'General';
    }
  }
}
