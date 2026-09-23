import { FormPlanResult } from './formPlanner';

export class ValidationPlanner {
  static enrich(plan: FormPlanResult): FormPlanResult {
    plan.questions = plan.questions.map(q => {
      const labelLower = q.label.toLowerCase();
      const validations: Record<string, any> = {};
      
      if (labelLower.includes("email")) {
        validations.pattern = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
        validations.message = "Please enter a valid email address.";
      }
      if (labelLower.includes("phone") || labelLower.includes("mobile")) {
        validations.pattern = "^\\+?[0-9]{7,15}$";
        validations.message = "Please enter a valid phone number.";
      }
      
      return {
        ...q,
        validations
      };
    });
    return plan;
  }
}
