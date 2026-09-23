import { IFieldPlan, IFormSection } from '../fieldIntelligence/interfaces';

export interface IFormLayout {
  type: 'single_page' | 'multi_page' | 'stepper' | 'accordion' | 'card' | 'adaptive' | 'wizard-steps' | 'compact-grid' | 'single-question' | 'floating-grid';
  columns: number;
}

export interface IQualityReport {
  passed: boolean;
  fixedDuplicates: number;
  fixedAccessibility: number;
  warnings: string[];
}
