// Builds the PPSU hard-bound project report (DOCX) for PromptForm AI.
// Layout follows "PPSU_Final_Hard_Bound_Project_Report_Format": A4, Cambria 12 pt, 1.5 spacing,
// justified body, 1" margins (0.75" bottom), chapter-wise figure/table numbering.
const fs = require('fs');
const path = require('path');
const d = require('../node_modules/docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType,
  HeadingLevel, BorderStyle, WidthType, PageNumber, PageBreak, ImageRun, Bookmark, PageReference,
  NumberFormat, TabStopType, ShadingType, VerticalAlign, LevelFormat
} = d;

const FONT = 'Cambria';
const NAVY = '1F3864';
const TEXT_W = 9026; // twips: A4 width 11906 - 2 * 1440

const content = [
  ...require('./content1'),
  ...require('./content2'),
  ...require('./content3'),
];
const META = require('./meta');

// ---------- pre-pass: number chapters, sections, figures, tables ----------
let chap = '', figN = 0, tblN = 0, bm = 0;
const keys = {}, toc = [], lof = [], lot = [];
for (const it of content) {
  if (it.h1) { chap = it.h1[0]; figN = 0; tblN = 0; it.bm = 'c' + (++bm); toc.push({ no: it.h1[0] ? `Chapter ${it.h1[0]}` : '', title: it.h1[1], bm: it.bm, lvl: 1 }); }
  else if (it.h2) { it.bm = 's' + (++bm); const m = it.h2.match(/^((?:[A-Z]|\d+)\.\d+|Appendix [A-H])\s*[–-]?\s*(.*)$/); toc.push({ no: m ? m[1] : '', title: m ? m[2] : it.h2, bm: it.bm, lvl: 2 }); }
  else if (it.fig) { it.no = `${chap}.${++figN}`; it.bm = 'f' + (++bm); lof.push({ no: `Figure ${it.no}`, title: it.fig.cap, bm: it.bm }); if (it.fig.key) keys[it.fig.key] = `Figure ${it.no}`; }
  else if (it.tbl) { it.no = `${chap}.${++tblN}`; it.bm = 't' + (++bm); lot.push({ no: `Table ${it.no}`, title: it.tbl.cap, bm: it.bm }); if (it.tbl.key) keys[it.tbl.key] = `Table ${it.no}`; }
}
const ref = s => String(s).replace(/\{(\w+)\}/g, (m, k) => keys[k] || m);

// ---------- primitives ----------
function runs(text, o = {}) {
  // supports **bold** inline markers
  return ref(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(t => new TextRun({
    text: t.startsWith('**') ? t.slice(2, -2) : t, bold: o.bold || t.startsWith('**'), italics: o.italic,
    font: FONT, size: o.size || 24, color: o.color,
  }));
}
const para = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED, spacing: { line: o.line || 360, before: o.before ?? 0, after: o.after ?? 120 },
  indent: o.indent, keepNext: o.keepNext, pageBreakBefore: o.pageBreakBefore, children: runs(text, o),
});
const center = (text, o = {}) => para(text, { ...o, align: AlignmentType.CENTER });
const ptitle = (text, id, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore: true,
  spacing: { before: o.before ?? 240, after: o.after ?? 240 },
  children: [new Bookmark({ id, children: [new TextRun({ text, bold: true, font: FONT, size: o.size || 32, color: NAVY })] })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const border = { style: BorderStyle.SINGLE, size: 4, color: '7F7F7F' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, w, o = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
    shading: o.head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9E2F3' } : (o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined),
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: (Array.isArray(text) ? text : String(text).split('\n')).map(t => t instanceof Paragraph ? t : new Paragraph({
      alignment: o.align || (o.head ? AlignmentType.CENTER : AlignmentType.LEFT), spacing: { line: 260, before: 0, after: 0 },
      children: runs(t, { size: o.size || 20, bold: o.head || o.bold }),
    })),
  });
}
function table(head, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const w = widths.map(x => Math.round(x / total * TEXT_W));
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: w,
    rows: [
      ...(head ? [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, w[i], { head: true })) })] : []),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, w[i], { bold: o.boldFirst && i === 0, align: o.alignCenter && i ? AlignmentType.CENTER : undefined })) })),
    ],
  });
}
function caption(label, title, bmId, o = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, keepNext: o.keepNext, spacing: { before: o.before ?? 80, after: o.after ?? 200, line: 276 },
    children: [new Bookmark({ id: bmId, children: [new TextRun({ text: `${label}: `, bold: true, font: FONT, size: 22 })] }), new TextRun({ text: title, font: FONT, size: 22, italics: true })],
  });
}
function pngSize(file) { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function image(file, maxW = 600, maxH = 760) {
  const [w, h] = pngSize(file);
  let W = maxW, H = Math.round(h / w * maxW);
  if (H > maxH) { H = maxH; W = Math.round(w / h * maxH); }
  return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 0 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: W, height: H },
      altText: { title: path.basename(file), description: path.basename(file), name: path.basename(file) } })] });
}
function heading1(no, title, bmId) {
  const out = [];
  if (no) out.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore: true, spacing: { before: 600, after: 120 },
    children: [new TextRun({ text: `CHAPTER ${no}`, bold: true, font: FONT, size: 32, color: NAVY })] }));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, pageBreakBefore: !no,
    spacing: { before: no ? 0 : 600, after: 360 },
    children: [new Bookmark({ id: bmId, children: [new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: 32, color: NAVY })] })] }));
  return out;
}
const heading2 = (t, bmId) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 120 },
  children: [new Bookmark({ id: bmId, children: [new TextRun({ text: t, bold: true, font: FONT, size: 26, color: NAVY })] })] });
const heading3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 200, after: 80 },
  children: [new TextRun({ text: t, bold: true, font: FONT, size: 24 })] });
const bullet = (t, lvl = 0) => new Paragraph({ numbering: { reference: 'bul', level: lvl }, alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 320, after: 60 }, children: runs(t) });
const numbered = (t, ref_) => new Paragraph({ numbering: { reference: ref_, level: 0 }, alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 320, after: 60 }, children: runs(t) });
const code = lines => new Table({
  width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W],
  rows: [new TableRow({ children: [new TableCell({ width: { size: TEXT_W, type: WidthType.DXA }, borders,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' }, margins: { top: 80, bottom: 80, left: 140, right: 100 },
    children: lines.split('\n').map(l => new Paragraph({ spacing: { line: 240, before: 0, after: 0 },
      children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 17 })] })) })] })],
});

// ---------- render content ----------
let numCounter = 0;
const numRefs = [];
function render(items) {
  const out = [];
  for (const it of items) {
    if (it.h1) { out.push(...heading1(it.h1[0], it.h1[1], it.bm)); if (it.h1[2]) out.push(para(it.h1[2], { italic: true })); }
    else if (it.h2) out.push(heading2(it.h2, it.bm));
    else if (it.h3) out.push(heading3(it.h3));
    else if (it.p) (Array.isArray(it.p) ? it.p : [it.p]).forEach(t => out.push(para(t)));
    else if (it.ul) it.ul.forEach(t => Array.isArray(t) ? t.forEach(s => out.push(bullet(s, 1))) : out.push(bullet(t)));
    else if (it.ol) { const r = 'num' + (++numCounter); numRefs.push(r); it.ol.forEach(t => out.push(numbered(t, r))); }
    else if (it.tbl) {
      out.push(caption(`Table ${it.no}`, it.tbl.cap, it.bm, { keepNext: true, before: 160, after: 80 }));
      out.push(table(it.tbl.head, it.tbl.rows, it.tbl.w || it.tbl.head.map(() => 1), it.tbl));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
    else if (it.fig) { out.push(image(it.fig.img, it.fig.w || 600, it.fig.h || 700)); out.push(caption(`Figure ${it.no}`, it.fig.cap, it.bm)); }
    else if (it.code) { out.push(code(it.code)); if (it.codeCap) out.push(center(it.codeCap, { italic: true, size: 20, before: 60 })); else out.push(new Paragraph({ spacing: { after: 120 }, children: [] })); }
    else if (it.refs) it.refs.forEach(t => out.push(para(t, { align: AlignmentType.LEFT, line: 276, after: 140, indent: { left: 540, hanging: 540 } })));
    else if (it.pb) out.push(pageBreak());
    else if (it.raw) out.push(...it.raw);
  }
  return out;
}

// ---------- preliminary pages ----------
const M = META;
function cover() {
  return [
    center('P P SAVANI UNIVERSITY', { bold: true, size: 40, color: NAVY, before: 400, after: 60 }),
    center('SCHOOL OF ENGINEERING', { bold: true, size: 30, color: NAVY, after: 360 }),
    center('INTERNSHIP / UDP / TRAINING', { bold: true, size: 28, after: 60 }),
    center('FINAL PROJECT REPORT', { bold: true, size: 36, color: NAVY, after: 60 }),
    center('(Hard-Bound Project Report Format)', { italic: true, size: 24, after: 600 }),
    table(['Particular', 'Details'], [
      ['Project Title', M.title], ['Student Name', M.student], ['Enrollment Number', M.enrollment], ['Program / Branch', M.program],
      ['Semester', M.semester], ['Company / Organization', M.company], ['Department / Domain', M.domain], ['Mentor (Company)', M.mentorCompany],
      ['Mentor (Institute)', M.mentorInstitute], ['Academic Year', M.year],
    ], [35, 65], { boldFirst: true }),
  ];
}
function certificate() {
  return [
    ptitle('CERTIFICATE', 'p_cert', { size: 36, before: 600, after: 0 }),
    center('OF COMPLETION', { bold: true, size: 28, color: NAVY, after: 480 }),
    center('This is to certify that', { after: 120 }),
    center(M.student, { bold: true, size: 30, after: 60 }),
    center(`Enrollment No.: ${M.enrollment}`, { bold: true, after: 240 }),
    para(`of ${M.program}, ${M.semester}, has successfully completed the Internship / UDP / Training project titled`, { align: AlignmentType.CENTER }),
    center(`“${M.title}”`, { bold: true, size: 26, color: '2E74B5', before: 120, after: 120 }),
    para(`during the period from ${M.start} to ${M.end} at ${M.company}, under the guidance of ${M.mentorCompany} and ${M.mentorInstitute}.`, { align: AlignmentType.CENTER }),
    para('The project work, final implementation, testing and validation, documentation, and demonstration were completed as required for the Internship / UDP / Training and found satisfactory.', { align: AlignmentType.CENTER, before: 120 }),
    para(`Date of Issue: ${M.issueDate}`, { bold: true, before: 360, after: 1000 }),
    new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W / 2, TEXT_W / 2], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
      rows: [new TableRow({ children: ['Mentor (Company)', 'Mentor (Institute)'].map(t => new TableCell({ width: { size: TEXT_W / 2, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [center('________________________', { after: 0 }), center(t, { bold: true })] })) })] }),
  ];
}
function declaration() {
  return [
    ptitle('DECLARATION', 'p_decl', { size: 36, before: 600, after: 480 }),
    para(`I hereby declare that this report is a consolidated and authentic record of the Internship / UDP / Training project work titled “${M.title}” carried out by me during the period ${M.start} to ${M.end} at ${M.company}. All sources used have been appropriately acknowledged and cited.`),
    para('I further declare that the work presented in this report has not been submitted, in part or in full, to any other university or institution for the award of any degree or diploma. Third-party libraries, frameworks, services and published works used in the project are listed in Chapter 15 (References) and cited in the text using the APA 7th Edition style.'),
    para('Date: ' + M.issueDate, { bold: true, before: 600 }), para('Place: ' + M.place, { bold: true }),
    para('________________________', { align: AlignmentType.RIGHT, before: 720, after: 0 }),
    para(M.student, { align: AlignmentType.RIGHT, bold: true, after: 0 }),
    para(`Enrollment No.: ${M.enrollment}`, { align: AlignmentType.RIGHT }),
  ];
}
function listTable(title, head, rows, bmLabel) {
  return [
    ptitle(title, bmLabel),
    table(head, rows, head.length === 3 ? [22, 63, 15] : [80, 20]),
  ];
}
const pref = id => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 260, before: 0, after: 0 }, children: [new PageReference(id, { font: FONT })] });
function tocRows() {
  const rows = [
    ['**Preliminary Pages**', '', ''],
    ...[['Certificate', 'p_cert'], ['Declaration', 'p_decl'], ['Acknowledgement', 'p_ack'], ['Abstract / Executive Summary', 'p_abs'],
      ['Table of Contents', 'p_toc'], ['List of Figures', 'p_lof'], ['List of Tables', 'p_lot'], ['List of Abbreviations / Acronyms', 'p_abbr']]
      .map(([t, id]) => ['', t, [pref(id)]]),
  ];
  return rows.map(r => r).concat(toc.map(t => [t.lvl === 1 ? `**${t.no || ''}**` : t.no, t.lvl === 1 ? `**${t.title}**` : t.title, [pref(t.bm)]]));
}

// ---------- assemble ----------
function header() {
  return new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
    children: [new TextRun({ text: 'P P SAVANI UNIVERSITY | SCHOOL OF ENGINEERING', font: FONT, size: 18, bold: true, color: NAVY }),
      new TextRun({ children: ['\t', PageNumber.CURRENT], font: FONT, size: 20, bold: true })],
  })] });
}
function footer() {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6', space: 4 } },
    children: [new TextRun({ text: `${M.shortTitle} — Final Project Report`, font: FONT, size: 16, italics: true, color: '595959' })] })] });
}
const page = { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1080, left: 1440, right: 1440, header: 600, footer: 500 } };

const ack = require('./front').ack(M), abs = require('./front').abstract(M), abbr = require('./front').abbreviations;

const prelim = [
  ...certificate(), ...declaration(),
  ptitle('ACKNOWLEDGEMENT', 'p_ack', { size: 36, before: 360, after: 360 }), ...ack.map(t => para(t)),
  ptitle('ABSTRACT / EXECUTIVE SUMMARY', 'p_abs', { after: 300 }), ...abs.body.map(t => para(t)),
  para('**Keywords:** ' + abs.keywords, { before: 200 }),
  ptitle('TABLE OF CONTENTS', 'p_toc'),
  table(['Chapter / Section No.', 'Title', 'Tentative Page'], tocRows(), [22, 63, 15]),
  ...listTable('LIST OF FIGURES', ['Figure No.', 'Title', 'Page'], lof.map(f => [f.no, f.title, [pref(f.bm)]]), 'p_lof'),
  ...listTable('LIST OF TABLES', ['Table No.', 'Title', 'Page'], lot.map(f => [f.no, f.title, [pref(f.bm)]]), 'p_lot'),
  ptitle('LIST OF ABBREVIATIONS / ACRONYMS', 'p_abbr'),
  table(['Abbreviation', 'Full Form / Meaning'], abbr, [25, 75], { boldFirst: true }),
];

const doc = new Document({
  creator: M.student, title: M.title, description: 'PPSU Final Hard-Bound Project Report',
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 360 } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: NAVY }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: NAVY }, paragraph: { outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } },
      { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 300 } } } }] },
    ...Array.from({ length: 40 }, (_, i) => ({ reference: 'num' + (i + 1), levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
  ] },
  features: { updateFields: false },
  sections: [
    // Single continuous Arabic page numbering from the cover page, header only (as in the PPSU format).
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } }, headers: { default: header() },
      children: [...cover(), ...prelim, ...render(content)] },
  ],
});

const out = path.join(__dirname, '..', 'PromptForm_AI_PPSU_Final_Report.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('written', out, `${toc.length} toc, ${lof.length} figures, ${lot.length} tables`); });
