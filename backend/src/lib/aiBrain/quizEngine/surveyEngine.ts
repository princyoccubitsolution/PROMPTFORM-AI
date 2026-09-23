import { ISurveyConfig } from './interfaces';

export class SurveyEngine {
  static configure(domain: string, prompt: string): ISurveyConfig | undefined {
    const isSurvey = domain === 'survey' || prompt.toLowerCase().includes("survey") || prompt.toLowerCase().includes("nps");
    if (!isSurvey) return undefined;

    const lowercase = prompt.toLowerCase();
    if (lowercase.includes("nps") || lowercase.includes("net promoter")) {
      return {
        scaleType: 'nps',
        npsScore: 9, // Promoter default
        npsCategory: 'promoter'
      };
    }

    if (lowercase.includes("likert") || lowercase.includes("agree")) {
      return {
        scaleType: 'likert'
      };
    }

    return {
      scaleType: 'star'
    };
  }
}
