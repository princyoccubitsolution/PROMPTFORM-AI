export interface IFieldMetadata {
  type: string;
  label: string;
  required: boolean;
  options: string[];
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  validations?: Record<string, any>;
  logic?: Record<string, any>;
  calculation?: string;
  accessibilityLabel?: string;
  autocomplete?: string;
  readOnly?: boolean;
  hidden?: boolean;
  correctAnswer?: string;
  explanation?: string;
}

export interface IFormSection {
  title: string;
  description?: string;
  fields: IFieldMetadata[];
}

export interface IFieldPlan {
  domain: string;
  industry: string;
  sections: IFormSection[];
  suggestedAdditions: string[];
  rules: string[];
  normalizedPrompt?: string;
}
