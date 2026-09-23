export interface IQuizPlanSettings {
  timerLimitMinutes: number;
  shuffleQuestions: boolean;
  attemptLimits: number;
}

export class QuizPlanner {
  static plan(domain: string): IQuizPlanSettings {
    const isQuiz = domain === 'quiz';
    return {
      timerLimitMinutes: isQuiz ? 15 : 0,
      shuffleQuestions: isQuiz,
      attemptLimits: isQuiz ? 3 : 0
    };
  }
}
