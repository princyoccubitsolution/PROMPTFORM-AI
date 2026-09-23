import { IQualityReport } from './interfaces';

export class QualityVerifier {
  static verifyAndFix(formConfig: any): { formConfig: any; report: IQualityReport } {
    let fixedDuplicates = 0;
    let fixedAccessibility = 0;
    let fixedOptions = 0;
    let fixedPlaceholders = 0;
    let fixedValidations = 0;
    const warnings: string[] = [];

    // 1. Audit duplicate labels
    const labelsMap = new Map<string, number>();
    formConfig.questions = formConfig.questions.map((q: any) => {
      const label = q.label;
      if (labelsMap.has(label)) {
        const count = labelsMap.get(label)! + 1;
        labelsMap.set(label, count);
        q.label = `${label} (${count})`;
        fixedDuplicates++;
      } else {
        labelsMap.set(label, 1);
      }
      return q;
    });

    // 2. Comprehensive Quality Check & Auto-fixer (Rule 13 Verification)
    formConfig.questions = formConfig.questions.map((q: any) => {
      // Best Field Type Verification
      if (!q.type) q.type = "name";

      // Mark required fields logically
      if (q.required === undefined) {
        q.required = true;
      }

      // Dropdown/MCQ/Checkbox options populate check (Rule 7 Check)
      const optionTypes = ["mcq", "one_option", "gender", "checkbox", "multiple_options", "dropdown", "country", "agreement", "interactive-tag-cloud"];
      if (optionTypes.includes(q.type)) {
        if (!Array.isArray(q.options) || q.options.length === 0) {
          if (q.type === "gender") {
            q.options = ["Male", "Female", "Non Binary", "Prefer Not To Say"];
          } else if (q.type === "country") {
            q.options = ["United States", "United Kingdom", "Canada", "Australia", "India", "Germany", "France", "Japan", "Other"];
          } else if (q.type === "agreement") {
            q.options = ["I agree to all terms, conditions, and privacy policies."];
          } else {
            q.options = ["Option 1", "Option 2", "Option 3"];
          }
          fixedOptions++;
        }
      }

      // Placeholder and Help text check (Rule 9 Check)
      if (!q.placeholder || !q.placeholder.trim()) {
        if (q.type === "email") q.placeholder = "e.g. john@example.com";
        else if (q.type === "phone") q.placeholder = "e.g. +1 (555) 000-0000";
        else if (q.type === "name") q.placeholder = "e.g. Jane Doe";
        else if (q.type === "website") q.placeholder = "e.g. https://portfolio.com";
        else if (q.type === "amount") q.placeholder = "Enter amount...";
        else if (q.type === "price") q.placeholder = "0.00";
        else if (q.type === "address") q.placeholder = "Enter address...";
        else if (q.type === "date") q.placeholder = "YYYY-MM-DD";
        else if (q.type === "time") q.placeholder = "HH:MM";
        else if (q.type === "otp") q.placeholder = "123456";
        else q.placeholder = `Provide entry for ${q.label}`;
        fixedPlaceholders++;
      }

      if (!q.helpText || !q.helpText.trim()) {
        if (q.type === "email") q.helpText = "Enter a valid email address.";
        else if (q.type === "phone") q.helpText = "Contact number including country code.";
        else if (q.type === "resume") q.helpText = "Upload PDF/DOCX resume file (max 10MB).";
        else if (q.type === "photo") q.helpText = "Upload image file (max 5MB).";
        else if (q.type === "signature") q.helpText = "Sign inside the box to verify.";
        else q.helpText = `Please fill out this field carefully.`;
      }

      // Description field ensure
      if (!q.description) {
        q.description = `Input field for ${q.label}`;
      }

      // Accessibility Screen Reader Labels
      if (!q.accessibilityLabel) {
        q.accessibilityLabel = `Input field for entering ${q.label}`;
        fixedAccessibility++;
      }

      // Validations check (Rule 8 Check)
      if (!q.validations || typeof q.validations !== 'object') {
        q.validations = {};
      }
      if (q.type === "email" && !q.validations.pattern) {
        q.validations.pattern = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
        q.validations.message = "Please enter a valid email address.";
        fixedValidations++;
      }
      if (q.type === "phone" && !q.validations.pattern) {
        q.validations.pattern = "^\\+?[0-9\\s\\-\\(\\)]{7,20}$";
        q.validations.message = "Please enter a valid phone number.";
        fixedValidations++;
      }

      return q;
    });

    // 3. Fallback form Title validation
    if (!formConfig.title || !formConfig.title.trim()) {
      formConfig.title = "Standard AI Form";
      warnings.push("Form title was missing and set to standard default.");
    }

    return {
      formConfig,
      report: {
        passed: true,
        fixedDuplicates,
        fixedAccessibility,
        warnings
      }
    };
  }
}
