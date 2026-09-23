import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class ValidationGenerator {
  static generate(field: IFieldMetadata): Record<string, any> {
    const validations = field.validations || {};
    
    // Fallback required validator configuration
    if (field.required && !validations.required) {
      validations.required = true;
      validations.message = `${field.label} is required.`;
    }

    return validations;
  }
}
