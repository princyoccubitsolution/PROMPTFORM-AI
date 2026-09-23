import { IFieldMetadata } from '../fieldIntelligence/interfaces';

export interface IOCRExtraction {
  text: string;
  confidence: number;
  boundingBox?: [number, number, number, number];
  type: 'label' | 'input' | 'header' | 'footer' | 'signature' | 'checkbox';
}

export interface IDocumentWorkflow {
  purpose: string;
  industry: string;
  requiredSubmissions: string[];
  approvalStages: string[];
  complianceVerified: boolean;
}

export interface IDocParsedPlan {
  title: string;
  description: string;
  fields: IFieldMetadata[];
  workflow?: IDocumentWorkflow;
  sourceType: 'pdf' | 'docx' | 'xlsx' | 'image' | 'url' | 'unknown';
}
