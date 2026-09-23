import { FormPlanResult } from './formPlanner';

export class LogicPlanner {
  static enrich(plan: FormPlanResult): FormPlanResult {
    plan.questions = plan.questions.map(q => ({
      ...q,
      logic: {}
    }));
    return plan;
  }
}
