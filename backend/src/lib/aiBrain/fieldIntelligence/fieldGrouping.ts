import { IFieldMetadata, IFormSection } from './interfaces';

export class FieldGrouping {
  static group(fields: IFieldMetadata[], domain: string): IFormSection[] {
    const sections: IFormSection[] = [];

    if (fields.length >= 5) {
      const contactFields = fields.filter(f => 
        /name|email|phone|address|dob|birth|gender|patient|student|guest|client|reporter|donor|buyer/i.test(f.label)
      );
      const fileFields = fields.filter(f => 
        /upload|resume|cv|photo|image|passport|blueprint|screenshot|file|document/i.test(f.label) && !contactFields.includes(f)
      );
      const declarationFields = fields.filter(f => 
        /agree|consent|terms|declaration|signature|sign|waiver/i.test(f.label) && !contactFields.includes(f) && !fileFields.includes(f)
      );
      const detailFields = fields.filter(f => 
        !contactFields.includes(f) && !fileFields.includes(f) && !declarationFields.includes(f)
      );

      if (contactFields.length > 0) {
        sections.push({ title: "Personal & Contact Information", fields: contactFields });
      }
      if (detailFields.length > 0) {
        sections.push({ title: "Inquiry & Detail Specifications", fields: detailFields });
      }
      if (fileFields.length > 0) {
        sections.push({ title: "Attachments & Documents", fields: fileFields });
      }
      if (declarationFields.length > 0) {
        sections.push({ title: "Declarations & Verification", fields: declarationFields });
      }
    } else {
      sections.push({ title: "General Section", fields });
    }

    return sections;
  }
}
