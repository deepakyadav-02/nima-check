require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const inferBatch = (doc) => {
  if (doc.batch) return String(doc.batch).trim();

  const roll = String(
    doc['Autonomous Roll No'] || doc['Roll No'] || doc['College Roll No'] || ''
  ).trim();

  const nacMatch = roll.match(/NAC(\d{2})/i);
  if (nacMatch) return `20${nacMatch[1]}`;

  const bbaMatch = roll.match(/BBA(\d{2})/i);
  if (bbaMatch) return `20${bbaMatch[1]}`;

  const collegeMatch = roll.match(/[A-Za-z]+-?(\d{2})-/);
  if (collegeMatch) return `20${collegeMatch[1]}`;

  return 'unknown';
};

const hasAbc = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

async function collectReportData(db) {
  const collections = [
    { coll: 'ugstudents', type: 'UG' },
    { coll: 'pgstudents', type: 'PG' },
    { coll: 'bbastudents', type: 'BBA' },
    { coll: 'ugfirstsem2025', type: 'UG2025' },
    { coll: 'pgfirstsem2025', type: 'PG2025' },
  ];

  const rows = [];
  const grand = {};
  const collectionCounts = [];

  for (const { coll, type } of collections) {
    const count = await db.collection(coll).countDocuments();
    collectionCounts.push({ type, coll, count });

    if (!count) continue;

    const docs = await db
      .collection(coll)
      .find({})
      .project({
        ABC_ID: 1,
        batch: 1,
        'Roll No': 1,
        'Autonomous Roll No': 1,
      })
      .toArray();

    const byBatch = {};

    docs.forEach((doc) => {
      const batch = inferBatch(doc);
      const withAbc = hasAbc(doc.ABC_ID);

      if (!byBatch[batch]) byBatch[batch] = { total: 0, withAbc: 0 };
      byBatch[batch].total += 1;
      if (withAbc) byBatch[batch].withAbc += 1;

      if (!grand[batch]) grand[batch] = { total: 0, withAbc: 0 };
      grand[batch].total += 1;
      if (withAbc) grand[batch].withAbc += 1;
    });

    Object.keys(byBatch)
      .sort()
      .forEach((batch) => {
        const item = byBatch[batch];
        rows.push({
          batch,
          studentType: type,
          total: item.total,
          withAbc: item.withAbc,
          withoutAbc: item.total - item.withAbc,
          pct: item.total ? ((item.withAbc / item.total) * 100).toFixed(1) : '0.0',
        });
      });
  }

  const portalSubmissions = await db.collection('abcidsubmissions').countDocuments();

  return {
    generatedAt: new Date(),
    database: process.env.MONGO_URI || 'not configured',
    rows,
    grand: Object.keys(grand)
      .sort()
      .map((batch) => {
        const item = grand[batch];
        return {
          batch,
          total: item.total,
          withAbc: item.withAbc,
          withoutAbc: item.total - item.withAbc,
          pct: item.total ? ((item.withAbc / item.total) * 100).toFixed(1) : '0.0',
        };
      }),
    collectionCounts,
    portalSubmissions,
    totalStudents: rows.reduce((sum, row) => sum + row.total, 0),
    totalWithAbc: rows.reduce((sum, row) => sum + row.withAbc, 0),
  };
}

function drawTable(doc, { x, y, headers, rows, colWidths }) {
  const rowHeight = 22;
  const headerHeight = 26;
  let cursorY = y;

  doc.save();
  doc.rect(x, cursorY, colWidths.reduce((a, b) => a + b, 0), headerHeight).fill('#4a5568');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);

  let cursorX = x;
  headers.forEach((header, index) => {
    doc.text(header, cursorX + 6, cursorY + 8, { width: colWidths[index] - 12 });
    cursorX += colWidths[index];
  });

  cursorY += headerHeight;
  doc.fillColor('#111111').font('Helvetica').fontSize(9);

  rows.forEach((row, rowIndex) => {
    const fill = rowIndex % 2 === 0 ? '#f7fafc' : '#ffffff';
    doc.rect(x, cursorY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(fill);
    doc.fillColor('#111111');

    cursorX = x;
    row.forEach((cell, index) => {
      doc.text(String(cell), cursorX + 6, cursorY + 7, { width: colWidths[index] - 12 });
      cursorX += colWidths[index];
    });
    cursorY += rowHeight;
  });

  doc.restore();
  return cursorY + 10;
}

function buildPdf(report, outputPath) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  doc
    .fillColor('#1a365d')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Nimapara Autonomous College', left, 50, { width: pageWidth, align: 'center' });

  doc
    .fillColor('#2d3748')
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('ABC ID Registration Report by Batch', left, 78, { width: pageWidth, align: 'center' });

  doc
    .fillColor('#4a5568')
    .font('Helvetica')
    .fontSize(10)
    .text(`Generated on: ${report.generatedAt.toLocaleString('en-IN')}`, left, 104, {
      width: pageWidth,
      align: 'center',
    });

  doc.moveDown(2);

  let y = 140;

  doc.fillColor('#111111').font('Helvetica-Bold').fontSize(12).text('Executive Summary', left, y);
  y += 24;

  const summaryLines = [
    `Total students in database: ${report.totalStudents}`,
    `Students with ABC ID on record: ${report.totalWithAbc}`,
    `Students without ABC ID: ${report.totalStudents - report.totalWithAbc}`,
    `Portal ABC submissions: ${report.portalSubmissions}`,
    `Database: ${report.database}`,
  ];

  doc.font('Helvetica').fontSize(10);
  summaryLines.forEach((line) => {
    doc.text(`• ${line}`, left, y, { width: pageWidth });
    y += 16;
  });

  y += 10;
  doc.font('Helvetica-Bold').fontSize(12).text('ABC ID Status by Batch and Student Type', left, y);
  y += 22;

  y = drawTable(doc, {
    x: left,
    y,
    headers: ['Batch', 'Type', 'Total', 'With ABC ID', 'Without', 'Coverage'],
    colWidths: [70, 70, 70, 85, 75, 80],
    rows: report.rows.map((row) => [
      row.batch,
      row.studentType,
      row.total,
      row.withAbc,
      row.withoutAbc,
      `${row.pct}%`,
    ]),
  });

  doc.font('Helvetica-Bold').fontSize(12).text('Grand Total by Batch', left, y);
  y += 22;

  y = drawTable(doc, {
    x: left,
    y,
    headers: ['Batch', 'Total Students', 'With ABC ID', 'Without ABC ID', 'Coverage'],
    colWidths: [80, 100, 90, 110, 80],
    rows: report.grand.map((row) => [
      row.batch,
      row.total,
      row.withAbc,
      row.withoutAbc,
      `${row.pct}%`,
    ]),
  });

  if (y > doc.page.height - 180) {
    doc.addPage();
    y = 50;
  }

  doc.font('Helvetica-Bold').fontSize(12).text('Database Collections', left, y);
  y += 22;

  y = drawTable(doc, {
    x: left,
    y,
    headers: ['Student Type', 'Collection', 'Record Count'],
    colWidths: [120, 180, 120],
    rows: report.collectionCounts.map((item) => [item.type, item.coll, item.count]),
  });

  y += 8;
  doc.font('Helvetica-Bold').fontSize(12).text('Notes', left, y);
  y += 18;

  const notes = [
    'Batch year is inferred from roll number patterns such as BC24-001, 81NAC24001, 111NAC24001, and NACBBA24-001.',
    'ABC ID is checked on student records (ABC_ID field) and in the portal submissions collection (abcidsubmissions).',
    'UG2025 and PG2025 collections are included in this report even if they currently contain zero records.',
    'This report reflects the database state at the time of generation.',
  ];

  doc.font('Helvetica').fontSize(9).fillColor('#4a5568');
  notes.forEach((note) => {
    doc.text(`• ${note}`, left, y, { width: pageWidth });
    y += 28;
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in config.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const report = await collectReportData(mongoose.connection.db);
  await mongoose.disconnect();

  const reportsDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const dateStamp = report.generatedAt.toISOString().slice(0, 10);
  const outputPath = path.join(reportsDir, `ABC_ID_Batch_Report_${dateStamp}.pdf`);

  await buildPdf(report, outputPath);

  console.log('PDF report created:', outputPath);
  console.log(`Total students: ${report.totalStudents}`);
  console.log(`Students with ABC ID: ${report.totalWithAbc}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
