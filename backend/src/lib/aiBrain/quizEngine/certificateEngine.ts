import { ICertificateConfig } from './interfaces';

export class CertificateEngine {
  static planEligibility(domain: string): ICertificateConfig {
    const isQuiz = domain === 'quiz';
    return {
      eligible: isQuiz,
      passingPercentage: isQuiz ? 70 : 0,
      templateName: isQuiz ? "standard_achievement_award" : undefined
    };
  }
}
