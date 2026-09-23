import { FieldTemplate } from './knowledgeEngine';

export interface FormPlanResult {
  title: string;
  description: string;
  questions: FieldTemplate[];
  theme: {
    primary_color: string;
    background_color: string;
    font_family: string;
    rtl: boolean;
  };
}

export class FormPlanner {
  static plan(domain: string, industry: string, presets: FieldTemplate[], isRtl: boolean): FormPlanResult {
    const title = `${industry} ${domain === 'general' ? 'Information' : domain.toUpperCase()} Form`;
    const description = `This is a professional ${industry} form designed for your custom requirements.`;

    return {
      title,
      description,
      questions: presets,
      theme: {
        primary_color: "#6366f1",
        background_color: "#f8fafc",
        font_family: "Inter",
        rtl: isRtl
      }
    };
  }
}
