import { IFieldMetadata } from '../fieldIntelligence/interfaces';
import { IOCRExtraction } from './interfaces';

export class FieldExtractor {
  static extractFields(extractions: IOCRExtraction[]): IFieldMetadata[] {
    return extractions
      .filter(e => e.type === 'label' || e.type === 'signature')
      .map(e => {
        const type = e.type === 'signature' ? 'signature' : 
                     e.text.toLowerCase().includes("email") ? "short_text" : 
                     e.text.toLowerCase().includes("phone") ? "short_text" : "short_text";
        return {
          type,
          label: e.text.replace(/:/g, "").trim(),
          required: true,
          options: []
        };
      });
  }
}
