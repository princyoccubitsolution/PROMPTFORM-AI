import { IOCRExtraction } from './interfaces';

export class LayoutDetector {
  static detectGrid(extractions: IOCRExtraction[]): { columns: number; totalFieldsCount: number } {
    return {
      columns: 12,
      totalFieldsCount: extractions.filter(e => e.type === 'label').length
    };
  }
}
