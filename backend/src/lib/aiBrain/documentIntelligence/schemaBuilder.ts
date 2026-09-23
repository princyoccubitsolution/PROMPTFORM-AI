import { IDocParsedPlan } from './interfaces';
import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export class SchemaBuilder {
  static build(title: string, fields: IFieldMetadata[]): IDocParsedPlan {
    return {
      title,
      description: "Structured form mapped from document layout parameters.",
      fields,
      sourceType: "pdf"
    };
  }
}
