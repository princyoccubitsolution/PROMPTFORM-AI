import { IAssessmentPlan, IQuestionMetadata, ISurveyConfig, ICertificateConfig } from './interfaces';
import { QuizPlanner } from './quizPlanner';
import { QuestionGenerator } from './questionGenerator';
import { OptionGenerator } from './optionGenerator';
import { DifficultyEngine } from './difficultyEngine';
import { SurveyEngine } from './surveyEngine';
import { AssessmentEngine } from './assessmentEngine';
import { RatingEngine } from './ratingEngine';
import { LogicEngine } from './logicEngine';
import { CertificateEngine } from './certificateEngine';
import { AnalyticsEngine } from './analyticsEngine';
import { QuestionValidator } from './questionValidator';

export * from './interfaces';
export * from './quizPlanner';
export * from './questionGenerator';
export * from './optionGenerator';
export * from './difficultyEngine';
export * from './surveyEngine';
export * from './assessmentEngine';
export * from './ratingEngine';
export * from './logicEngine';
export * from './certificateEngine';
export * from './analyticsEngine';
export * from './questionValidator';

export class EnterpriseQuizEngine {
  static resolve(domain: string, prompt: string, flatFields: any[]): IAssessmentPlan {
    let questions = QuestionGenerator.generate(domain, flatFields);
    questions = DifficultyEngine.score(questions);
    questions = LogicEngine.attachSkipLogic(questions);
    questions = QuestionValidator.validateAndRepair(questions);

    const surveyConfig = SurveyEngine.configure(domain, prompt);
    const certificateConfig = CertificateEngine.planEligibility(domain);
    const leaderboardReady = AnalyticsEngine.configureLeaderboard(domain);

    return {
      domain,
      questions,
      surveyConfig,
      certificateConfig,
      leaderboardReady
    };
  }
}
