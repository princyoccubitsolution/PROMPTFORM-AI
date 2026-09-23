import { IFieldMetadata } from './interfaces';

export class FieldValidation {
  static apply(fields: IFieldMetadata[]): IFieldMetadata[] {
    return fields.map(field => {
      const type = field.type;
      const validations: Record<string, any> = field.validations || {};

      if (type === "email") {
        validations.pattern = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
        validations.message = "Please enter a valid email address.";
      } else if (type === "phone") {
        validations.pattern = "^\\+?[0-9\\s\\-\\(\\)]{7,20}$";
        validations.message = "Please enter a valid phone number.";
      } else if (type === "website") {
        validations.pattern = "^https?:\\/\\/[^\\s/$.?#].[^\\s]*$";
        validations.message = "Please enter a valid website URL.";
      } else if (type === "otp") {
        validations.pattern = "^[0-9]{6}$";
        validations.max_length = 6;
        validations.message = "OTP verification code must be exactly 6 digits.";
      } else if (type === "password") {
        validations.min_length = 8;
        validations.password_strength = "strong";
        validations.message = "Password must be at least 8 characters and contain letters, numbers, and symbols.";
      } else if (type === "resume") {
        validations.allowed_file_types = [".pdf", ".doc", ".docx"];
        validations.file_size_limit = 10 * 1024 * 1024; // 10MB
        validations.message = "Please upload a resume file in PDF or Word format (max 10MB).";
      } else if (type === "photo") {
        validations.allowed_file_types = [".jpg", ".jpeg", ".png", ".webp"];
        validations.file_size_limit = 5 * 1024 * 1024; // 5MB
        validations.message = "Please upload a photo in JPEG, PNG or WEBP format (max 5MB).";
      } else if (type === "amount" || type === "price") {
        validations.min = 0;
        validations.message = "Must be a non-negative number.";
      }

      field.validations = validations;
      return field;
    });
  }
}
