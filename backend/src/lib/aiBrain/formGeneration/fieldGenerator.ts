import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class FieldGenerator {
  static generate(field: IFieldMetadata): IFieldMetadata {
    return {
      type: field.type || "short_text",
      label: field.label,
      required: field.required || false,
      options: Array.isArray(field.options) ? field.options : [],
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      defaultValue: field.defaultValue || null,
      readOnly: field.readOnly || false,
      hidden: field.hidden || false,
      correctAnswer: (field as any).correctAnswer,
      explanation: (field as any).explanation,
      points: (field as any).points,
      tags: (field as any).tags,
      category: (field as any).category,
      difficulty: (field as any).difficulty,
      bloomsTaxonomy: (field as any).bloomsTaxonomy
    };
  }
}
