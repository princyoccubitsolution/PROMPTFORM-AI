const fs = require('fs');
const path = require('path');
const docx = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  PageNumber, PageBreak, LevelFormat
} = docx;

// Color Palette
const PRIMARY = "1E3A8A";    // Deep Navy / Indigo
const SECONDARY = "3B82F6";  // Slate Blue
const ACCENT = "0D9488";     // Teal
const DARK_BG = "F3F4F6";    // Light Slate Background for Table Headers
const BORDER_COLOR = "D1D5DB";

// Styling Helper Functions
function p(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: { line: 360, before: options.before || 60, after: options.after || 120 },
    children: Array.isArray(text) ? text : [
      new TextRun({
        text: text,
        font: "Cambria",
        size: options.size || 24, // 12pt
        bold: !!options.bold,
        italic: !!options.italic,
        color: options.color || "000000"
      })
    ]
  });
}

function h1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 240, after: 180 },
    children: [
      new TextRun({
        text: title,
        font: "Cambria",
        size: 32, // 16pt
        bold: true,
        color: PRIMARY
      })
    ]
  });
}

function h2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [
      new TextRun({
        text: title,
        font: "Cambria",
        size: 28, // 14pt
        bold: true,
        color: SECONDARY
      })
    ]
  });
}

function h3(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({
        text: title,
        font: "Cambria",
        size: 26, // 13pt
        bold: true,
        color: ACCENT
      })
    ]
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: 360, before: 40, after: 60 },
    children: [
      new TextRun({
        text: text,
        font: "Cambria",
        size: 24
      })
    ]
  });
}

function createTable(headers, rows, widths) {
  const tableRows = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h, idx) => new TableCell({
        width: widths ? { size: widths[idx], type: WidthType.DXA } : undefined,
        shading: { fill: PRIMARY },
        margins: { top: 120, bottom: 120, left: 150, right: 150 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: h,
                font: "Cambria",
                size: 22,
                bold: true,
                color: "FFFFFF"
              })
            ]
          })
        ]
      }))
    })
  );

  // Data Rows
  rows.forEach((row, rIdx) => {
    tableRows.push(
      new TableRow({
        children: row.map((cellText, idx) => new TableCell({
          width: widths ? { size: widths[idx], type: WidthType.DXA } : undefined,
          shading: rIdx % 2 === 1 ? { fill: "F9FAFB" } : undefined,
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: String(cellText),
                  font: "Cambria",
                  size: 20
                })
              ]
            })
          ]
        }))
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
    }
  });
}

function calloutBox(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F0F9FF" },
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: SECONDARY },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({ text: `${title}: `, font: "Cambria", size: 24, bold: true, color: PRIMARY }),
                  new TextRun({ text: text, font: "Cambria", size: 24, italic: true })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

console.log("Helper utilities initialized successfully.");
