import pdfParse = require('pdf-parse');
import mammoth = require('mammoth');
import * as xlsx from 'xlsx';

export async function parseDocument(fileBuffer: Buffer, mimeType: string): Promise<string> {
  if (!fileBuffer) return "";

  try {
    // 1. PDF files
    if (mimeType === 'application/pdf') {
      let parsedText = "";
      try {
        if (typeof pdfParse === 'function') {
          const parsedData = await (pdfParse as any)(fileBuffer);
          parsedText = parsedData.text || "";
        } else if (pdfParse && typeof (pdfParse as any).PDFParse === 'function') {
          const PDFParseClass = (pdfParse as any).PDFParse;
          const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
          const parser = new PDFParseClass(uint8Array);
          const result = await parser.getText();
          parsedText = result.text || "";
        } else {
          // Fallback to direct require destructuring
          const { PDFParse } = require('pdf-parse');
          const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
          const parser = new PDFParse(uint8Array);
          const result = await parser.getText();
          parsedText = result.text || "";
        }
      } catch (pdfErr: any) {
        console.error("PDF Parsing Exception: ", pdfErr.message);
      }
      return parsedText;
    }

    // 2. Word documents (DOCX)
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value || "";
    }

    // 3. Excel files (XLSX / XLS)
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_txt(worksheet) + "\n";
      }
      return text;
    }

    // 4. Text / CSV / JSON files
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/csv' ||
      mimeType.includes('csv')
    ) {
      return fileBuffer.toString('utf-8');
    }

    // 5. Image files (mock OCR description)
    if (mimeType.startsWith('image/')) {
      return "Image upload detected. [Simulated OCR Extraction]: Image contains a form layout with fields: Full Name, Email Address, Contact Number, Organization Name, Signature Area, Date Picker.";
    }

    // Default fallback to string parsing
    return fileBuffer.toString('utf-8').substring(0, 10000);
  } catch (error) {
    console.error("Document parsing failed:", error);
    return "";
  }
}
