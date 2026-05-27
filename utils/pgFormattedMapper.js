const { expandDepartmentSubjects } = require('./departmentPaperNames');
const { isOdiaDepartment } = require('./odiaPaperNames');
const { isChemistryDepartment } = require('./chemistryPaperNames');
const { isGeologyDepartment } = require('./geologyPaperNames');
const { isMathematicsDepartment } = require('./mathematicsPaperNames');
const { isCommerceDepartment } = require('./commercePaperNames');
const { toPaperSubject } = require('./pgSubjectPaper');

const MARK_FIELDS = new Set([
  'Midsem-Mark',
  'Final-Mark',
  'Practical-Mark',
  'Total-Mark',
  'Grade',
  'Grade-Point',
  'Credit',
  'Credit-Point',
]);

const extractPaperInfo = (subject) => {
  for (const [key, value] of Object.entries(subject)) {
    if (!MARK_FIELDS.has(key) && value !== '' && value != null) {
      return { code: key, title: String(value) };
    }
  }
  return { code: 'Other', title: 'Unknown' };
};

const mapSubject = (subject, options = {}) => {
  const { code, title } = extractPaperInfo(subject);
  const credit = subject.Credit != null && subject.Credit !== '' ? Number(subject.Credit) : undefined;
  const creditPoint =
    subject['Credit-Point'] != null && subject['Credit-Point'] !== ''
      ? Number(subject['Credit-Point'])
      : undefined;

  let row = toPaperSubject(
    {
      credit: Number.isFinite(credit) ? credit : undefined,
      creditPoint: Number.isFinite(creditPoint) ? creditPoint : undefined,
      midsemMark: subject['Midsem-Mark'] ?? '',
      finalMark: subject['Final-Mark'] ?? '',
      practicalMark: subject['Practical-Mark'] ?? '',
      totalMark: subject['Total-Mark'] ?? '',
      marks:
        subject['Total-Mark'] !== '' && subject['Total-Mark'] != null
          ? Number(subject['Total-Mark'])
          : undefined,
      grade: subject.Grade ?? '',
      gradePoint: subject['Grade-Point'] ?? '',
    },
    code,
    title
  );

  const department = options.department || '';
  const semester = options.semester;
  if (
    semester &&
    (isOdiaDepartment(department) ||
      isChemistryDepartment(department) ||
      isGeologyDepartment(department) ||
      isMathematicsDepartment(department) ||
      isCommerceDepartment(department))
  ) {
    const [expanded] = expandDepartmentSubjects([row], semester, department);
    row = expanded;
  }

  return row;
};

const mapFormattedRecord = (record, semesterNum) => ({
  rollNo: record['Roll No'] || '',
  autonomousRollNo: record['Autonomous Roll No'],
  examcode: record.Examcode || '',
  department: record.Department || '',
  studentName: record['Name of the Students'] || '',
  subjects: (record.Subjects || []).map((s) =>
    mapSubject(s, { department: record.Department, semester: semesterNum })
  ),
  grandTotal: record.GrandTotal ?? '',
  grade: record.Grade ?? '',
  gradePoint: record['Grade-Point'] ?? '',
  percentage: record.Percentage ?? '',
  classification: record.Classification ?? '',
  performance: record.Performance ?? '',
});

module.exports = { mapFormattedRecord, mapSubject, extractPaperInfo };
