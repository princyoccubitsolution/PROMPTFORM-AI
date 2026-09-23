import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class SignatureGenerator {
  static configure(field: IFieldMetadata): Record<string, any> {
    const validations: Record<string, any> = field.validations || {};
    
    if (field.type === 'signature') {
      validations.pen_color = "#000000";
      validations.clear_button = true;
    }

    return validations;
  }
}
