const { FEE_STRUCTURE } = require('../data/feeStructure2026');

const STREAMS = ['arts', 'science', 'commerce'];
const CATEGORIES = ['boys', 'girls', 'scStPh'];
const YEAR_LEVELS = ['2', '3'];

const SCIENCE_DEPARTMENTS = new Set([
  'CHEMISTRY', 'PHYSICS', 'MATHEMATICS', 'MATH', 'BOTANY', 'ZOOLOGY',
  'GEOLOGY', 'BIOTECHNOLOGY', 'BIOTECH', 'COMPUTER SCIENCE', 'IT',
]);

const COMMERCE_DEPARTMENTS = new Set([
  'COMMERCE', 'ACCOUNTING', 'BBA', 'BBA ', 'BCA', 'BBA(CA)', 'MANAGEMENT',
]);

const normalizeKey = (value) => (value || '').toString().trim().toUpperCase();

const mapDepartmentToStream = (department, course, studentType) => {
  const dept = normalizeKey(department);
  const crs = normalizeKey(course);
  const type = normalizeKey(studentType);

  if (type === 'BBA' || dept.includes('BBA') || crs.includes('BBA')) {
    return 'commerce';
  }

  if (SCIENCE_DEPARTMENTS.has(dept) || SCIENCE_DEPARTMENTS.has(crs)) {
    return 'science';
  }

  if (COMMERCE_DEPARTMENTS.has(dept) || COMMERCE_DEPARTMENTS.has(crs)) {
    return 'commerce';
  }

  return 'arts';
};

const inferYearLevel = (student) => {
  const rollNo = (student['Roll No'] || student['College Roll No'] || student.autonomousRollNo || '').toString();
  const batch = (student.batch || '').toString();

  const batchMatch = rollNo.match(/(?:BA|BSC|BCOM|BBA|BBM)?-?(\d{2})-/i) || rollNo.match(/(\d{2})NAC/i);
  const admissionYear = batchMatch ? 2000 + parseInt(batchMatch[1], 10) : null;

  if (admissionYear) {
    const currentYear = new Date().getFullYear();
    const yearsSinceAdmission = currentYear - admissionYear;
    if (yearsSinceAdmission >= 2) return '3';
    if (yearsSinceAdmission >= 1) return '2';
  }

  if (batch === '2023' || batch === '23') return '3';
  if (batch === '2024' || batch === '24') return '2';

  return '2';
};

const isEligibleForUgFees = (studentType) => {
  const type = normalizeKey(studentType);
  return type === 'UG' || type === 'UG2025';
};

const readStudentField = (student, ...keys) => {
  for (const key of keys) {
    const value = student?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

const normalizeCategory = (value) => {
  const key = normalizeKey(value);
  if (['BOYS', 'BOY', 'MALE', 'M', 'BOYS.'].includes(key)) return 'boys';
  if (['GIRLS', 'GIRL', 'FEMALE', 'F', 'GIRLS.'].includes(key)) return 'girls';
  if (key.includes('SC/ST') || key.includes('SC ST') || key === 'SC' || key === 'ST' || key.includes('PH')) {
    return 'scStPh';
  }
  if (value === 'boys' || value === 'girls' || value === 'scStPh') return value;
  return null;
};

const normalizeStream = (value) => {
  const key = normalizeKey(value);
  if (key.includes('SCIENCE') || key === 'SCI') return 'science';
  if (key.includes('COMMERCE') || key.includes('COM')) return 'commerce';
  if (key.includes('ARTS') || key === 'ART') return 'arts';
  if (['arts', 'science', 'commerce'].includes(value)) return value;
  return null;
};

const normalizeYearLevel = (value) => {
  const key = normalizeKey(value);
  if (key === '2' || key.includes('2ND') || key.includes('SECOND')) return '2';
  if (key === '3' || key.includes('3RD') || key.includes('THIRD')) return '3';
  if (value === '2' || value === '3') return value;
  return null;
};

const resolveStudentFeeAssignment = (student, studentType) => {
  const yearLevel =
    normalizeYearLevel(readStudentField(student, 'feeYearLevel', 'Fee Year', 'Year Level', 'yearLevel')) ||
    inferYearLevel(student);

  const stream =
    normalizeStream(readStudentField(student, 'feeStream', 'Fee Stream', 'Stream', 'stream')) ||
    mapDepartmentToStream(
      readStudentField(student, 'Department', 'Course'),
      readStudentField(student, 'Stream'),
      studentType
    );

  const category =
    normalizeCategory(readStudentField(student, 'feeCategory', 'Fee Category', 'Category', 'Gender', 'gender'));

  if (!category) {
    return {
      yearLevel,
      stream,
      category: null,
      error: 'Your fee category is not assigned yet. Please contact the college office.',
    };
  }

  return { yearLevel, stream, category, error: null };
};

const resolveStudentFeeBreakdown = (student, studentType) => {
  const assignment = resolveStudentFeeAssignment(student, studentType);
  if (assignment.error) {
    return { assignment, breakdown: null };
  }

  const breakdown = getFeeBreakdown({
    yearLevel: assignment.yearLevel,
    stream: assignment.stream,
    category: assignment.category,
  });

  return { assignment, breakdown };
};

const getFeeBreakdown = ({ yearLevel, stream, category }) => {
  if (!YEAR_LEVELS.includes(yearLevel)) {
    throw new Error('Invalid year level. Must be 2 or 3.');
  }
  if (!STREAMS.includes(stream)) {
    throw new Error('Invalid stream. Must be arts, science, or commerce.');
  }
  if (!CATEGORIES.includes(category)) {
    throw new Error('Invalid category. Must be boys, girls, or scStPh.');
  }

  const yearData = FEE_STRUCTURE.years[yearLevel];
  const lineItems = yearData.items.map((item) => ({
    slNo: item.slNo,
    name: item.name,
    amount: item.amounts[stream][category],
  }));

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    academicYear: FEE_STRUCTURE.academicYear,
    yearLevel,
    yearLabel: yearData.label,
    stream,
    category,
    lineItems,
    total,
  };
};

module.exports = {
  STREAMS,
  CATEGORIES,
  YEAR_LEVELS,
  mapDepartmentToStream,
  inferYearLevel,
  isEligibleForUgFees,
  getFeeBreakdown,
  resolveStudentFeeAssignment,
  resolveStudentFeeBreakdown,
  normalizeCategory,
};
