import { IFormLayout } from './interfaces';
import { IFieldPlan } from '../fieldIntelligence/interfaces';

export class LayoutGenerator {
  static decide(plan: IFieldPlan): IFormLayout {
    const text = plan.normalizedPrompt?.toLowerCase() || "";
    const isMedical = plan.domain === 'medical' || text.includes("hospital") || text.includes("medical");
    const isEducation = plan.industry === 'Education' || text.includes("school") || text.includes("college") || text.includes("admission");
    const isTech = text.includes("tech") || text.includes("science") || text.includes("antigravity") || text.includes("aerospace");
    const isReview = plan.domain === 'survey' || text.includes("review") || text.includes("feedback") || text.includes("restaurant");

    const totalFields = plan.sections.reduce((sum, s) => sum + s.fields.length, 0);

    let layoutType = "compact-grid";
    if (totalFields > 8) {
      layoutType = "stepper";
    } else if (plan.domain === 'invoice' || plan.domain === 'complaint') {
      layoutType = "card";
    } else if (isMedical) {
      layoutType = "wizard-steps";
    } else if (isEducation) {
      layoutType = "compact-grid";
    } else if (isTech) {
      layoutType = "floating-grid";
    } else if (isReview) {
      layoutType = "single-question";
    } else {
      layoutType = "single_page";
    }

    return {
      type: layoutType as any,
      columns: 12
    };
  }
}
