import { IFieldPlan } from '../fieldIntelligence/interfaces';
import { LayoutGenerator } from './layoutGenerator';
import { SectionGenerator } from './sectionGenerator';
import { FieldGenerator } from './fieldGenerator';
import { ValidationGenerator } from './validationGenerator';
import { UploadGenerator } from './uploadGenerator';
import { SignatureGenerator } from './signatureGenerator';
import { PaymentGenerator } from './paymentGenerator';
import { ResponsiveGenerator } from './responsiveGenerator';
import { JsonAssembler } from './jsonAssembler';
import { QualityVerifier } from './qualityVerifier';

export class EnterpriseFormGenerator {
  static generate(plan: IFieldPlan): any {
    // 1. Decide layout style
    const layout = LayoutGenerator.decide(plan);

    // 2. Format sections
    const formattedSections = SectionGenerator.generate(plan.sections);

    // 3. Process fields
    const flatQuestions = formattedSections.flatMap(section => 
      section.fields.map((field, idx) => {
        // Standardize fields
        const baseField = FieldGenerator.generate(field);

        // Validation mapping
        const baseValidations = ValidationGenerator.generate(field);

        // Specialized integrations
        const uploadValidations = UploadGenerator.configure(field);
        const signatureValidations = SignatureGenerator.configure(field);
        const paymentValidations = PaymentGenerator.configure(field);

        const validations = {
          ...baseValidations,
          ...uploadValidations,
          ...signatureValidations,
          ...paymentValidations
        };

        // Grid responsiveness columns
        const width = ResponsiveGenerator.computeWidth(field);

        return {
          ...baseField,
          validations,
          logic: field.logic || {},
          width,
          orderIndex: idx
        };
      })
    );

    // 4. Assemble configuration JSON
    const draftConfig = JsonAssembler.assemble(plan, layout, flatQuestions);

    // 5. Pre-flight Quality check audits & auto-corrections
    const { formConfig } = QualityVerifier.verifyAndFix(draftConfig);

    return formConfig;
  }
}
