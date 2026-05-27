const path = require('path');

const MARK_FIELDS = new Set([
  'Midsem-Mark',
  'Final-Mark',
  'Practical-Mark',
  'Total-Mark',
  'Grade',
  'Grade-Point',
]);

const DEFAULT_CREDIT = 4;

const parseNum = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const extractPaperInfo = (subject) => {
  for (const [key, value] of Object.entries(subject)) {
    if (!MARK_FIELDS.has(key) && value !== '' && value != null) {
      return { courseType: key, subjectName: String(value) };
    }
  }
  return { courseType: 'Other', subjectName: 'Unknown' };
};

const transformSubject = (subject, credit = DEFAULT_CREDIT) => {
  const { courseType, subjectName } = extractPaperInfo(subject);
  const midsem = parseNum(subject['Midsem-Mark']);
  const endsem = parseNum(subject['Final-Mark']);
  const practical = parseNum(subject['Practical-Mark']);
  const marks = parseNum(subject['Total-Mark']) ?? 0;
  const gradePoint = parseNum(subject['Grade-Point']);
  const creditPoint = gradePoint !== undefined ? gradePoint * credit : undefined;

  const course = {
    subjectName,
    courseType,
    credit,
    marks,
    grade: subject.Grade || undefined,
    gradePoint,
    creditPoint,
  };

  if (midsem !== undefined) course.midsem = midsem;
  if (endsem !== undefined) course.endsem = endsem;
  if (practical !== undefined) course.practical = practical;

  return course;
};

const parsePercentage = (value) => {
  if (value === '' || value == null) return undefined;
  const num = parseFloat(String(value).replace('%', '').trim());
  return Number.isFinite(num) ? num : undefined;
};

const inferSemesterFromPath = (filePath) => {
  const base = path.basename(filePath);
  const match = base.match(/(\d+)(?:st|nd|rd|th)sem/i);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Transform one record from *-pg-formatted.json into pgMark_sheet upload shape.
 */
const transformFormattedRecord = (record, semester) => {
  const courses = (record.Subjects || []).map((subject) => transformSubject(subject));
  const totalCredits = courses.reduce((sum, course) => sum + course.credit, 0);
  const totalCreditPoints = courses.reduce(
    (sum, course) => sum + (course.creditPoint || 0),
    0
  );
  const sgpa = parseNum(record['Grade-Point']);
  const percentage = parsePercentage(record.Percentage);

  return {
    CollegeRollNo: record['Roll No'] || '',
    AutonomousRollNo: record['Autonomous Roll No'],
    Examcode: record.Examcode,
    Name: record['Name of the Students'],
    semester,
    courses,
    totalCredits,
    totalCreditPoints,
    sgpa,
    percentage,
    classification: record.Classification || record.Performance || undefined,
    department: record.Department,
  };
};

const transformFormattedFile = (records, semester) => {
  if (!Array.isArray(records)) {
    throw new Error('JSON root must be an array of student records');
  }
  if (!semester) {
    throw new Error('Semester is required');
  }
  return records.map((record) => transformFormattedRecord(record, semester));
};

module.exports = {
  MARK_FIELDS,
  parseNum,
  extractPaperInfo,
  transformSubject,
  transformFormattedRecord,
  transformFormattedFile,
  inferSemesterFromPath,
};
