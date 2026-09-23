import { IQualityScores } from './interfaces';

export class QualityScoreEngine {
  static compute(
    formConfig: any, 
    logicLoopsCount: number, 
    invalidRegexCount: number, 
    missingAriaCount: number, 
    uxIssuesCount: number
  ): IQualityScores {
    const questionsCount = (formConfig.questions || []).length;

    const ux = uxIssuesCount === 0 ? 10 : Math.max(3, 10 - uxIssuesCount);
    const accessibility = missingAriaCount === 0 ? 10 : Math.max(3, 10 - missingAriaCount);
    const validation = invalidRegexCount === 0 ? 10 : Math.max(2, 10 - invalidRegexCount * 3);
    const logic = logicLoopsCount === 0 ? 10 : Math.max(1, 10 - logicLoopsCount * 5);
    const performance = questionsCount <= 15 ? 10 : 8;
    const security = 10;
    const compliance = 10;
    const maintainability = 10;
    const enterpriseReadiness = 10;

    const overall = parseFloat(((ux + accessibility + validation + logic + performance + security + compliance + maintainability + enterpriseReadiness) / 9).toFixed(2));

    return {
      overall,
      ux,
      accessibility,
      validation,
      logic,
      performance,
      security,
      compliance,
      maintainability,
      enterpriseReadiness
    };
  }
}
