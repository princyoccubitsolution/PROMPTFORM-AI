export interface IQuestionMetadata {
  type: string;
  label: string;
  required: boolean;
  options: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  category?: string;
  tags?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  negativePoints?: number;
  learningObjective?: string;
  bloomsTaxonomy?: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  logic?: Record<string, any>;
}

export interface ISurveyConfig {
  scaleType: 'likert' | 'rating' | 'nps' | 'emoji' | 'star' | 'open_feedback';
  npsScore?: number;
  npsCategory?: 'detractor' | 'passive' | 'promoter';
}

export interface ICertificateConfig {
  eligible: boolean;
  passingPercentage: number;
  templateName?: string;
}

export interface IAssessmentPlan {
  domain: string;
  questions: IQuestionMetadata[];
  surveyConfig?: ISurveyConfig;
  certificateConfig?: ICertificateConfig;
  leaderboardReady: boolean;
}
