import { FormPlanResult } from './formPlanner';

export class SelfReviewer {
  static review(plan: FormPlanResult, targetLang: string): FormPlanResult {
    if (!plan.title.trim()) {
      plan.title = "Standard AI Form";
    }
    plan.questions = plan.questions.filter(q => q.label.trim().length > 0);
    
    plan.questions = plan.questions.map(q => {
      if (Array.isArray(q.options)) {
        q.options = Array.from(new Set(q.options));
      }
      return q;
    });

    return plan;
  }
}
