export interface IQualityScores {
  overall: number;
  ux: number;
  accessibility: number;
  validation: number;
  logic: number;
  performance: number;
  security: number;
  compliance: number;
  maintainability: number;
  enterpriseReadiness: number;
}

export interface IReviewReport {
  passed: boolean;
  scores: IQualityScores;
  autoFixesApplied: string[];
  warnings: string[];
}
