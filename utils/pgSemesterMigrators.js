const { expandDepartmentSubjects } = require('./departmentPaperNames');
const { toPaperSubject, getPaperCode, getPaperTitle } = require('./pgSubjectPaper');

const normalizeCourseSubject = (course) =>
  toPaperSubject(
    {
      credit: course.credit,
      midsemMark: course.midsem ?? course.midsemMark ?? '',
      finalMark: course.endsem ?? course.finalMark ?? '',
      practicalMark: course.practical ?? course.practicalMark ?? '',
      totalMark: course.marks ?? course.totalMark ?? '',
      marks: course.marks,
      grade: course.grade || '',
      gradePoint: course.gradePoint ?? '',
      creditPoint: course.creditPoint,
      percentage: course.percentage,
    },
    course.courseType || course.paperCode || '',
    course.subjectName || course.paperName || ''
  );

const normalizeFormattedSubject = (subject) =>
  toPaperSubject(
    {
      credit: subject.credit,
      creditPoint: subject.creditPoint,
      midsemMark: subject.midsemMark ?? '',
      finalMark: subject.finalMark ?? '',
      practicalMark: subject.practicalMark ?? '',
      totalMark: subject.totalMark ?? '',
      marks: subject.marks ?? (subject.totalMark !== '' ? Number(subject.totalMark) : undefined),
      grade: subject.grade || '',
      gradePoint: subject.gradePoint ?? '',
    },
    getPaperCode(subject) || subject.paperCode || '',
    getPaperTitle(subject) || subject.paperName || ''
  );

const toSemesterBlock = ({ subjects, dataSource, ...rest }) => ({
  examcode: rest.examcode || '',
  subjects,
  grandTotal: rest.grandTotal ?? '',
  totalCredits: rest.totalCredits,
  totalCreditPoints: rest.totalCreditPoints,
  totalMarks: rest.totalMarks,
  sgpa: rest.sgpa,
  grade: rest.grade || '',
  gradePoint: rest.gradePoint ?? '',
  percentage: rest.percentage ?? '',
  classification: rest.classification || '',
  performance: rest.performance || '',
  dataSource,
});

const expandOdiaSubjects = (subjects, semester, department) =>
  expandDepartmentSubjects(subjects, semester, department);

const fromSem3Or4 = (doc, dataSource, semesterNum = 3) => {
  const department = doc.department || doc.Department || '';
  let subjects = (doc.subjects || []).map(normalizeFormattedSubject);
  subjects = expandOdiaSubjects(subjects, semesterNum, department);

  return toSemesterBlock({
    examcode: doc.examcode || '',
    subjects,
    grandTotal: doc.grandTotal ?? '',
    grade: doc.grade ?? '',
    gradePoint: doc.gradePoint ?? '',
    percentage: doc.percentage ?? '',
    classification: doc.classification ?? '',
    performance: doc.performance ?? '',
    dataSource,
  });
};

/** pg2ndsem2024: { "Paper 2.1": { subject, mid, end, ... } } → paper.code + paper.title */
const papersObjectToSubjects = (papers) =>
  Object.entries(papers).map(([paperKey, paper]) => {
    const abbrev = paper.subject || paper.paperName || '';
    return toPaperSubject(
      {
        credit: paper.Credit != null ? Number(paper.Credit) : paper.credit,
        midsemMark: paper.mid ?? paper.midsem ?? paper.Midsem ?? '',
        finalMark: paper.end ?? paper.endsem ?? paper.End ?? '',
        practicalMark: paper.practical ?? paper.Practical ?? '',
        totalMark: paper.TotalMark ?? paper.totalMark ?? '',
        marks:
          paper.TotalMark != null
            ? Number(paper.TotalMark)
            : paper.marks != null
              ? Number(paper.marks)
              : undefined,
        grade: paper.Grade ?? paper.grade ?? '',
        gradePoint: paper['Grade Point'] ?? paper.gradePoint ?? '',
        creditPoint:
          paper.CP != null ? Number(paper.CP) : paper.creditPoint != null ? Number(paper.creditPoint) : undefined,
      },
      paperKey,
      abbrev
    );
  });

const fromSem2 = (doc) => {
  let subjects = [];
  const department = doc.Department || doc.department || doc.course || '';

  if (doc.papers && typeof doc.papers === 'object' && !Array.isArray(doc.papers)) {
    subjects = papersObjectToSubjects(doc.papers);
  } else if (Array.isArray(doc.courses) && doc.courses.length > 0) {
    subjects = doc.courses.map(normalizeCourseSubject);
  } else if (Array.isArray(doc.Subjects) && doc.Subjects.length > 0) {
    subjects = doc.Subjects.map(normalizeFormattedSubject);
  }

  subjects = expandOdiaSubjects(subjects, 2, department);

  const grandTotal =
    doc.GrandTotalMark ??
    doc.grandTotal ??
    doc.totalMarks ??
    '';

  const totalCreditPoints = doc.TotalCreditPoint ?? doc.totalCreditPoints;

  return toSemesterBlock({
    examcode: doc.Examcode || doc.examcode || '',
    subjects,
    grandTotal: grandTotal !== '' && grandTotal != null ? String(grandTotal) : '',
    grade: doc.grade ?? '',
    gradePoint: doc.gradePoint ?? doc['Grade Point'] ?? '',
    percentage: doc.Percentage ?? doc.percentage ?? '',
    classification: doc.Classification ?? doc.classification ?? '',
    performance: doc.performance ?? '',
    totalCredits: doc.totalCredits,
    totalCreditPoints: totalCreditPoints != null ? Number(totalCreditPoints) : doc.totalCreditPoints,
    totalMarks: doc.totalMarks != null ? Number(doc.totalMarks) : Number(doc.GrandTotalMark) || undefined,
    sgpa: doc.sgpa,
    dataSource: 'pg2ndsem2024',
  });
};

const fromSem1 = (marksheet) =>
  toSemesterBlock({
    examcode: '',
    subjects: (marksheet.courses || []).map(normalizeCourseSubject),
    grandTotal: '',
    grade: '',
    gradePoint: marksheet.sgpa ?? '',
    percentage: marksheet.percentage ?? '',
    classification: marksheet.classification ?? '',
    performance: '',
    totalCredits: marksheet.totalCredits,
    totalCreditPoints: marksheet.totalCreditPoints,
    sgpa: marksheet.sgpa,
    dataSource: 'ugmarksheets',
  });

const studentMetaFromSem3Or4 = (doc) => ({
  rollNo: doc.rollNo || '',
  studentName: doc.studentName || '',
  department: doc.department || '',
});

const studentMetaFromSem2 = (doc) => ({
  rollNo: doc.collegeRollNo || doc['Roll No'] || doc['College Roll No'] || '',
  studentName: doc.applicantName || doc['Name of the Students'] || '',
  department: doc.Department || doc.department || doc.course || '',
  course: doc.Department || doc.course || doc.department || '',
  dob: doc.dob || doc.DOB || '',
  graduationBoard: doc.graduationBoard || doc['Graduation Board'] || '',
});

const studentMetaFromStudent = (student) => ({
  rollNo: student?.['College Roll No'] || '',
  studentName: student?.['Applicant Name'] || '',
  department: student?.Course || '',
  course: student?.Course || '',
  dob: student?.DOB || '',
  graduationBoard: student?.['Graduation Board'] || '',
});

module.exports = {
  fromSem1,
  fromSem2,
  fromSem3Or4,
  studentMetaFromSem3Or4,
  studentMetaFromSem2,
  studentMetaFromStudent,
};
