const UGStudent = require('../models/UGStudent');
const PGStudent = require('../models/PGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const PGFirstSem2025 = require('../models/PGFirstSem2025');
const PGSecondSem2025 = require('../models/PGSecondSem2025');
const { UGSecondSem2025, UGFourthSem2024 } = require('../models/SemesterJsonCollections');

const SEMESTER_STUDENT_TYPES = ['UG2ND2025', 'UG4TH2024', 'PG2ND2025'];

const rollNumberQuery = (trimmedRollNo) => ({
  $or: [
    { 'Autonomous Roll No': trimmedRollNo },
    { 'Roll No': trimmedRollNo },
    { 'College Roll No': trimmedRollNo },
  ],
});

const inferBatchFromStudent = (student) => {
  if (student?.batch) return String(student.batch).trim();

  const roll = String(
    student?.['Autonomous Roll No'] || student?.['Roll No'] || student?.['College Roll No'] || ''
  ).trim().toUpperCase();

  // UG/BBA pattern: NAC + course letters + 2-digit batch + digits
  // e.g. NACBCA25015 → 2025, NACBCA24015 → 2024
  const ugMatch = roll.match(/^NAC[A-Z]+(\d{2})\d+/);
  if (ugMatch) return `20${ugMatch[1]}`;

  // UG with 2-digit college code: 03NAC25001 → 2025
  const ugCollegeFirst = roll.match(/^\d{2}NAC(\d{2})/);
  if (ugCollegeFirst) return `20${ugCollegeFirst[1]}`;

  // BBA separate pattern: BBA-24-001 or BBA-25-001
  const bbaMatch = roll.match(/^BBA-(\d{2})-/);
  if (bbaMatch) return `20${bbaMatch[1]}`;

  // Fallback: any NAC followed by 2 digits anywhere
  const nacFallback = roll.match(/NAC(\d{2})/i);
  if (nacFallback) return `20${nacFallback[1]}`;

  // Generic college roll: letters-digits-rest (e.g. COM-24-001)
  const collegeMatch = roll.match(/[A-Z]+-?(\d{2})-/);
  if (collegeMatch) return `20${collegeMatch[1]}`;

  return null;
};

const getSemesterKey = (studentType) => {
  switch (studentType?.toUpperCase()) {
    case 'UG2ND2025':
      return '2ndsem2025';
    case 'UG4TH2024':
      return '4thsem2024';
    default:
      return null;
  }
};

const getStudentModel = (studentType) => {
  switch (studentType?.toUpperCase()) {
    case 'UG':
      return UGStudent;
    case 'PG':
      return PGStudent;
    case 'BBA':
      return BBAStudent;
    case 'UG2025':
      return UGFirstSem2025;
    case 'PG2025':
      return PGFirstSem2025;
    case 'UG2ND2025':
      return UGSecondSem2025;
    case 'UG4TH2024':
      return UGFourthSem2024;
    case 'PG2ND2025':
      return PGSecondSem2025;
    default:
      return null;
  }
};

const toPlainStudent = (student) => {
  if (!student) return null;
  return typeof student.toObject === 'function' ? student.toObject() : { ...student };
};

const getDobValue = (record) => {
  const value = record?.dob ?? record?.DOB;
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const findFirstSem2025BySecondSem = async (studentData) => {
  const autonomousRoll = String(studentData['Autonomous Roll No'] || '').trim();
  const collegeRoll = String(studentData['Roll No'] || '').trim();

  if (autonomousRoll) {
    const byAutonomous = await UGFirstSem2025.findOne({ 'Roll No': autonomousRoll });
    if (byAutonomous) return byAutonomous;
  }

  if (collegeRoll) {
    const byCollege = await UGFirstSem2025.findOne({ 'Autonomous Roll No': collegeRoll });
    if (byCollege) return byCollege;
  }

  return null;
};

const mergeProfileFields = async (studentData) => {
  const autonomousRollNo = studentData['Autonomous Roll No'];
  if (!autonomousRollNo) return studentData;

  const needsAbc = !studentData.ABC_ID;
  const needsPhoto = !studentData.profileImage;
  const needsDob = !getDobValue(studentData);

  if (!needsAbc && !needsPhoto && !needsDob) return studentData;

  const ugRecord = await UGStudent.findOne({ 'Autonomous Roll No': autonomousRollNo });
  const firstSemRecord = needsDob ? await findFirstSem2025BySecondSem(studentData) : null;

  return {
    ...studentData,
    ABC_ID: studentData.ABC_ID || ugRecord?.ABC_ID || null,
    profileImage: studentData.profileImage || ugRecord?.profileImage || null,
    dob:
      getDobValue(studentData) ||
      getDobValue(firstSemRecord) ||
      getDobValue(ugRecord) ||
      null,
  };
};

const enrichStudentRecord = async (student) => {
  const plain = toPlainStudent(student);
  return mergeProfileFields(plain);
};

const formatAdmitCardData = async (student, studentType) => {
  let studentData = toPlainStudent(student);
  studentData = await mergeProfileFields(studentData);

  const batch = inferBatchFromStudent(studentData);
  const semesterKey = getSemesterKey(studentType);

  return {
    studentType,
    semesterKey,
    batch,
    autonomousRollNo: studentData['Autonomous Roll No'],
    name:
      studentData['Name of the Students'] ||
      studentData['Applicant Name'] ||
      studentData.Name,
    rollNo: studentData['Roll No'] || studentData['College Roll No'],
    department: studentData.Department || studentData.Course || null,
    dob: studentData.dob || studentData.DOB,
    ABC_ID: studentData.ABC_ID || null,
    profileImage: studentData.profileImage || null,
    examCode: studentData['Exam Code'] || studentData.Examcode || null,
    ...studentData,
  };
};

const resolveStudentMatch = ({
  bbaStudent,
  pgStudent,
  pgFirstSem2025,
  pgSecondSem2025,
  ug2nd2025,
  ug4th2024,
  ugStudent,
  ugFirstSem2025,
}) => {
  if (bbaStudent && (bbaStudent.Department === 'BBA ' || bbaStudent['Roll No']?.startsWith('BBA-'))) {
    return { student: bbaStudent, studentType: 'BBA' };
  }
  if (pgStudent && (pgStudent.Course || pgStudent['Graduation Board'])) {
    return { student: pgStudent, studentType: 'PG' };
  }
  if (pgFirstSem2025) {
    return { student: pgFirstSem2025, studentType: 'PG2025' };
  }
  if (pgSecondSem2025) {
    return { student: pgSecondSem2025, studentType: 'PG2ND2025' };
  }
  if (ug2nd2025) {
    return { student: ug2nd2025, studentType: 'UG2ND2025' };
  }
  if (ug4th2024) {
    return { student: ug4th2024, studentType: 'UG4TH2024' };
  }
  if (ugStudent) {
    return { student: ugStudent, studentType: 'UG' };
  }
  if (ugFirstSem2025) {
    return { student: ugFirstSem2025, studentType: 'UG2025' };
  }

  return { student: null, studentType: null };
};

const findStudentByRoll = async (trimmedRollNo) => {
  const query = rollNumberQuery(trimmedRollNo);
  const [
    ugStudent,
    pgStudent,
    bbaStudent,
    ugFirstSem2025,
    pgFirstSem2025,
    pgSecondSem2025,
    ug2nd2025,
    ug4th2024,
  ] = await Promise.all([
    UGStudent.findOne(query),
    PGStudent.findOne(query),
    BBAStudent.findOne(query),
    UGFirstSem2025.findOne(query),
    PGFirstSem2025.findOne(query),
    PGSecondSem2025.findOne(query),
    UGSecondSem2025.findOne(query),
    UGFourthSem2024.findOne(query),
  ]);

  return resolveStudentMatch({
    bbaStudent,
    pgStudent,
    pgFirstSem2025,
    pgSecondSem2025,
    ug2nd2025,
    ug4th2024,
    ugStudent,
    ugFirstSem2025,
  });
};

const findStudentRecord = async (autonomousRollNo, studentType) => {
  const normalizedType = studentType?.trim().toUpperCase();
  const Model = getStudentModel(normalizedType);

  if (normalizedType && Model) {
    const student = await Model.findOne({ 'Autonomous Roll No': autonomousRollNo });
    if (student) {
      return { student, studentType: normalizedType };
    }
  }

  const query = rollNumberQuery(autonomousRollNo);
  const [
    ugStudent,
    pgStudent,
    bbaStudent,
    ugFirstSem2025,
    pgFirstSem2025,
    pgSecondSem2025,
    ug2nd2025,
    ug4th2024,
  ] = await Promise.all([
    UGStudent.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    PGStudent.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    BBAStudent.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    UGFirstSem2025.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    PGFirstSem2025.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    PGSecondSem2025.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    UGSecondSem2025.findOne({ 'Autonomous Roll No': autonomousRollNo }),
    UGFourthSem2024.findOne({ 'Autonomous Roll No': autonomousRollNo }),
  ]);

  return resolveStudentMatch({
    bbaStudent,
    pgStudent,
    pgFirstSem2025,
    pgSecondSem2025,
    ug2nd2025,
    ug4th2024,
    ugStudent,
    ugFirstSem2025,
  });
};

const formatStudentSummary = (student, studentType) => ({
  id: student._id,
  studentType,
  autonomousRollNo: student['Autonomous Roll No'],
  name: student['Name of the Students'] || student['Applicant Name'] || student.Name,
  department: student.Department || student.Course || null,
  streamField: student.Stream || null,
  rollNo: student['Roll No'] || student['College Roll No'] || null,
  batch: inferBatchFromStudent(student),
  semesterKey: getSemesterKey(studentType),
});

module.exports = {
  SEMESTER_STUDENT_TYPES,
  rollNumberQuery,
  inferBatchFromStudent,
  getSemesterKey,
  getStudentModel,
  formatAdmitCardData,
  enrichStudentRecord,
  findStudentByRoll,
  findStudentRecord,
  formatStudentSummary,
};
