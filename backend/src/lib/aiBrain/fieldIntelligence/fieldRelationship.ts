import { IFieldMetadata } from './interfaces';

export class FieldRelationship {
  static resolve(fields: IFieldMetadata[]): IFieldMetadata[] {
    return fields.map((field, index) => {
      const label = field.label.toLowerCase();

      // Rule 12: If "Student" -> Show Education Section
      if (label.includes("education")) {
        const studentQ = fields.slice(0, index).find(f => f.label.toLowerCase().includes("student") || f.label.toLowerCase().includes("occupation"));
        if (studentQ) {
          field.logic = {
            action: "show",
            target_question_id: studentQ.label,
            condition: {
              operator: "equals",
              value: "Student"
            }
          };
        }
      }

      // Rule 12: If "Business" -> Show Company Details
      if (label.includes("company") || label.includes("business details")) {
        const businessQ = fields.slice(0, index).find(f => f.label.toLowerCase().includes("type") || f.label.toLowerCase().includes("employment"));
        if (businessQ) {
          field.logic = {
            action: "show",
            target_question_id: businessQ.label,
            condition: {
              operator: "equals",
              value: "Business"
            }
          };
        }
      }

      // Rule 12: If "No" -> Hide Follow-up Questions (e.g. Insurance Number dependent on "Has Insurance" = "Yes")
      if (label.includes("insurance number")) {
        const insQ = fields.slice(0, index).find(f => f.label.toLowerCase().includes("insurance"));
        if (insQ) {
          field.logic = {
            action: "show",
            target_question_id: insQ.label,
            condition: {
              operator: "equals",
              value: "Yes"
            }
          };
        }
      }

      if (label.includes("guardian name")) {
        const ageQ = fields.slice(0, index).find(f => f.label.toLowerCase().includes("age") || f.label.toLowerCase().includes("birth"));
        if (ageQ) {
          field.logic = {
            action: "show",
            target_question_id: ageQ.label,
            condition: {
              operator: "less_than",
              value: "18"
            }
          };
        }
      }

      // Auto calculation rules
      if (field.label === "Age") {
        field.calculation = "Auto-calculate Age from Date of Birth";
      }

      return field;
    });
  }
}
