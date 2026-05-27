/** Full marks (all 4 semesters combined) by PG department */
const DEPARTMENT_MAXIMUM_MARKS = {
  ODIA: 1800,
  CHEMISTRY: 1800,
  COMMERCE: 2500,
  GEOLOGY: 2000,
  MATH: 1900,
  MATHEMATICS: 1900,
};

const parseMark = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const num = Number(String(value).replace('%', '').trim());
  return Number.isFinite(num) ? num : 0;
};

const sumSubjectMarks = (subjects = []) =>
  subjects.reduce((sum, subject) => {
    const mark = subject.marks ?? subject.totalMark;
    return sum + parseMark(mark);
  }, 0);

/** Total marks for one semester block */
const getSemesterTotal = (semBlock) => {
  if (!semBlock) return 0;

  const fromGrandTotal = parseMark(semBlock.grandTotal);
  if (fromGrandTotal > 0) return fromGrandTotal;

  const fromTotalMarks = parseMark(semBlock.totalMarks);
  if (fromTotalMarks > 0) return fromTotalMarks;

  return sumSubjectMarks(semBlock.subjects);
};

const normalizeDepartment = (department = '') => {
  const key = String(department).trim().toUpperCase();
  if (key.includes('COMMERCE')) return 'COMMERCE';
  if (key.includes('CHEMISTRY') || key === 'CHEM') return 'CHEMISTRY';
  if (key.includes('GEOLOGY') || key === 'GEO') return 'GEOLOGY';
  if (key.includes('MATHEMATICS') || key.includes('MATH')) return 'MATH';
  if (key.includes('ODIA')) return 'ODIA';
  return key;
};

const getMaximumMarkForDepartment = (department) => {
  const normalized = normalizeDepartment(department);
  return DEPARTMENT_MAXIMUM_MARKS[normalized] ?? null;
};

/**
 * Build overall PG summary: sem1+sem2+sem3+sem4 = grandTotal, vs department maximum.
 */
const computeOverallSummary = (doc) => {
  const semesters = doc.semesters || {};
  const semesterTotals = {
    sem1: getSemesterTotal(semesters.sem1),
    sem2: getSemesterTotal(semesters.sem2),
    sem3: getSemesterTotal(semesters.sem3),
    sem4: getSemesterTotal(semesters.sem4),
  };

  const grandTotal =
    semesterTotals.sem1 +
    semesterTotals.sem2 +
    semesterTotals.sem3 +
    semesterTotals.sem4;

  const department = doc.department || doc.course || '';
  const maximumMark = getMaximumMarkForDepartment(department);

  const percentage =
    maximumMark && maximumMark > 0
      ? Number(((grandTotal / maximumMark) * 100).toFixed(2))
      : null;

  return {
    semesterTotals,
    grandTotal,
    maximumMark,
    percentage,
    department: normalizeDepartment(department) || department,
  };
};

/** Attach grandTotal, semesterTotals, maximumMark, percentage on a plain doc */
const applyOverallTotals = (doc) => {
  const summary = computeOverallSummary(doc);
  return {
    ...doc,
    semesterTotals: summary.semesterTotals,
    grandTotal: summary.grandTotal,
    maximumMark: summary.maximumMark,
    percentage: summary.percentage,
  };
};

const enrichPGAllSemestersDoc = (doc) => {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const { semesterTotals: _semesterTotals, ...rest } = plain;

  const hasStoredGrandTotal =
    plain.grandTotal != null && plain.grandTotal !== '' && Number(plain.grandTotal) >= 0;

  const summary = hasStoredGrandTotal
    ? {
        grandTotal: plain.grandTotal,
        maximumMark: plain.maximumMark ?? getMaximumMarkForDepartment(plain.department),
        percentage: plain.percentage,
      }
    : computeOverallSummary(plain);

  return {
    ...rest,
    grandTotal: summary.grandTotal,
    maximumMark: summary.maximumMark,
    percentage: summary.percentage,
  };
};

module.exports = {
  DEPARTMENT_MAXIMUM_MARKS,
  getSemesterTotal,
  getMaximumMarkForDepartment,
  computeOverallSummary,
  applyOverallTotals,
  enrichPGAllSemestersDoc,
};
