import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class ResponsiveGenerator {
  static computeWidth(field: IFieldMetadata): number {
    const type = field.type;
    const label = field.label.toLowerCase();

    // Long elements take 12 columns
    if (type === 'long_text' || type === 'signature' || type === 'file_upload' || label.includes("feedback") || label.includes("history")) {
      return 12;
    }

    // Short contact details take 6 columns (side-by-side on desktop)
    if (label.includes("email") || label.includes("phone") || label.includes("contact") || label.includes("age") || label.includes("birth")) {
      return 6;
    }

    return 12;
  }
}
