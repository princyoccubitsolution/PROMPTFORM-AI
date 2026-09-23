import { IDocParsedPlan } from './interfaces';
import { OcrEngine } from './ocrEngine';
import { ImageAnalyzer } from './imageAnalyzer';
import { LayoutDetector } from './layoutDetector';
import { TableExtractor } from './tableExtractor';
import { FieldExtractor } from './fieldExtractor';
import { WorkflowDetector } from './workflowDetector';
import { DocumentClassifier } from './documentClassifier';
import { WebsiteParser } from './websiteParser';
import { SchemaBuilder } from './schemaBuilder';
import { FormConverter } from './formConverter';
import { DocumentValidator } from './documentValidator';

export * from './interfaces';
export * from './ocrEngine';
export * from './imageAnalyzer';
export * from './layoutDetector';
export * from './tableExtractor';
export * from './fieldExtractor';
export * from './workflowDetector';
export * from './documentClassifier';
export * from './websiteParser';
export * from './schemaBuilder';
export * from './formConverter';
export * from './documentValidator';

export class EnterpriseDocumentIntelligenceEngine {
  static resolveDocument(buffer: Buffer, fileName: string): IDocParsedPlan {
    const rawText = `Simulated document text from file ${fileName}. Address: 123 Main St, phone: +1 555 123 4567, email: admin@promptform.ai.`;
    const domain = DocumentClassifier.classify(rawText);

    // Run simulated OCR character reader
    const extractions = OcrEngine.extract(buffer);

    // Fetch logo/signature flags
    const vision = ImageAnalyzer.analyzeVision(buffer);

    // Grid details
    const layout = LayoutDetector.detectGrid(extractions);

    // Extract table matrices
    const tables = TableExtractor.extractTables(rawText);

    // Extract field fields
    const fields = FieldExtractor.extractFields(extractions);

    // Workflow reviews
    const workflow = WorkflowDetector.detect(rawText);

    // Build document plan
    let docPlan = SchemaBuilder.build("Intelligent Mapped Form", fields);
    docPlan.workflow = workflow;
    docPlan.sourceType = "pdf";

    // Validate details & resolve repairs
    docPlan = DocumentValidator.validate(docPlan);

    return docPlan;
  }

  static resolveUrl(url: string): IDocParsedPlan {
    // Sift HTML site crawler
    let docPlan = WebsiteParser.parseUrl(url);
    docPlan = DocumentValidator.validate(docPlan);
    return docPlan;
  }
}
