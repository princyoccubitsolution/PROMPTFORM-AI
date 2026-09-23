import { IDocParsedPlan } from './interfaces';
import { IFieldPlan } from '../fieldIntelligence/interfaces';

export class FormConverter {
  static convertToFieldPlan(docPlan: IDocParsedPlan, domain: string): IFieldPlan {
    const rules = [
      "Extracted from document using intelligent OCR.",
      "Optimized field validation alignments."
    ];

    return {
      domain,
      industry: docPlan.workflow?.industry || "Enterprise General",
      sections: [
        {
          title: docPlan.title,
          description: docPlan.description,
          fields: docPlan.fields
        }
      ],
      suggestedAdditions: [],
      rules
    };
  }
}
