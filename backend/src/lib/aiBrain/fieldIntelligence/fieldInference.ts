import { IFieldMetadata } from './interfaces';

export class FieldInference {
  static infer(fields: IFieldMetadata[]): IFieldMetadata[] {
    return fields.map(field => {
      const type = field.type;
      const label = field.label;
      const lowerLabel = label.toLowerCase();

      // Placeholders
      if (!field.placeholder) {
        if (type === "name") {
          field.placeholder = "e.g. Jane Doe";
        } else if (type === "email") {
          field.placeholder = "e.g. jane.doe@company.com";
        } else if (type === "phone") {
          field.placeholder = "e.g. +1 (555) 019-2834";
        } else if (type === "website") {
          field.placeholder = "e.g. https://github.com/jane";
        } else if (type === "password") {
          field.placeholder = "••••••••";
        } else if (type === "amount") {
          field.placeholder = "Enter count/quantity...";
        } else if (type === "price") {
          field.placeholder = "0.00";
        } else if (type === "address") {
          field.placeholder = "Street address, City, State, Zip code...";
        } else if (type === "date") {
          field.placeholder = "YYYY-MM-DD";
        } else if (type === "time") {
          field.placeholder = "HH:MM AM/PM";
        } else if (type === "date-time-picker") {
          field.placeholder = "Select date and time...";
        } else if (type === "otp") {
          field.placeholder = "123456";
        } else if (type === "color") {
          field.placeholder = "Select color hex...";
        } else if (type === "location") {
          field.placeholder = "Search location address...";
        } else {
          field.placeholder = `Enter your ${lowerLabel}...`;
        }
      }

      // Help Texts
      if (!field.helpText) {
        if (type === "email") {
          field.helpText = "Used for sending confirmation and updates.";
        } else if (type === "phone") {
          field.helpText = "Primary phone number including area code.";
        } else if (type === "password") {
          field.helpText = "Create a secure password to protect your access.";
        } else if (type === "resume") {
          field.helpText = "Upload your CV/Resume file (PDF, DOCX, up to 10MB).";
        } else if (type === "photo") {
          field.helpText = "Upload a profile picture or photo document.";
        } else if (type === "signature") {
          field.helpText = "Draw your legal verification signature above.";
        } else if (type === "otp") {
          field.helpText = "We sent a 6-digit confirmation code to your device.";
        } else if (type === "location") {
          field.helpText = "Click map area or search address to pin your location.";
        } else if (type === "agreement") {
          field.helpText = "Please read and accept standard legal declarations.";
        } else if (type === "range-slider") {
          field.helpText = "Drag the slider handle to adjust the metric.";
        } else {
          field.helpText = `Provide response details for ${lowerLabel}.`;
        }
      }

      // Default values
      if (field.defaultValue === undefined || field.defaultValue === null) {
        if (type === "agreement") {
          field.defaultValue = false;
        } else if (type === "color") {
          field.defaultValue = "#6366f1";
        } else if (type === "range-slider") {
          field.defaultValue = 50;
        }
      }

      // Autocomplete tags
      if (type === "email") field.autocomplete = "email";
      else if (type === "phone") field.autocomplete = "tel";
      else if (type === "name") field.autocomplete = "name";
      else if (type === "address") field.autocomplete = "street-address";
      else if (type === "date" && lowerLabel.includes("birth")) field.autocomplete = "bday";

      // Accessibility screen labels
      field.accessibilityLabel = `Input field for entering ${label}`;

      return field;
    });
  }
}
