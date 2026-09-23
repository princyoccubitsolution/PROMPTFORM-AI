import { IDocParsedPlan } from './interfaces';

export class DocumentValidator {
  static validate(docPlan: IDocParsedPlan): IDocParsedPlan {
    // 1. Audit missing labels
    docPlan.fields = docPlan.fields.map(field => {
      if (!field.label || !field.label.trim()) {
        field.label = "Extracted Input Field";
      }
      return field;
    });

    // 2. Ensure accessibility configs are assigned
    docPlan.fields = docPlan.fields.map(field => {
      field.accessibilityLabel = `Extracted input field for entering ${field.label}`;
      return field;
    });

    return docPlan;
  }
}
