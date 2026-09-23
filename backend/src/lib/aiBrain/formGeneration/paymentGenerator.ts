import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class PaymentGenerator {
  static configure(field: IFieldMetadata): Record<string, any> {
    const validations: Record<string, any> = field.validations || {};
    
    if (field.type === 'payment' || field.label.toLowerCase().includes("payment")) {
      validations.currency = "USD";
      validations.amount_type = "variable";
    }

    return validations;
  }
}
