import { FormPlanResult } from './formPlanner';

export class JsonGenerator {
  static generate(plan: FormPlanResult, recommendedSettings: any): any {
    return {
      title: plan.title,
      description: plan.description,
      questions: plan.questions,
      theme: plan.theme,
      settings: {
        collect_emails: recommendedSettings.collect_emails,
        limit_responses: false,
        password: null,
        allow_editing: recommendedSettings.allow_editing,
        shuffle_questions: false,
        timer_limit: recommendedSettings.timer_limit,
        anti_cheat_detection: recommendedSettings.anti_cheat_detection
      }
    };
  }
}
