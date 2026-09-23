import { IFormSection } from './interfaces';

export class FieldOptimization {
  static optimize(sections: IFormSection[], maxFields = 15): IFormSection[] {
    // 1. Re-sort fields to ensure 'required' fields are displayed first where sensible
    return sections.map(section => {
      const sortedFields = [...section.fields].sort((a, b) => {
        if (a.required && !b.required) return -1;
        if (!a.required && b.required) return 1;
        return 0;
      });

      // Limit fields count per section to avoid canvas overflows
      return {
        ...section,
        fields: sortedFields.slice(0, maxFields)
      };
    });
  }
}
