import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class UploadGenerator {
  static configure(field: IFieldMetadata): Record<string, any> {
    const validations: Record<string, any> = field.validations || {};
    
    if (field.type === 'file_upload') {
      validations.file_size_limit = 10 * 1024 * 1024; // 10MB default
      validations.allowed_file_types = [
        "application/pdf", 
        "image/png", 
        "image/jpeg", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
    }
    
    return validations;
  }
}
