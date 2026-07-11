const mongoose = require('mongoose');
const UGStudent = require('../models/UGStudent');
const BBAStudent = require('../models/BBAStudent');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const UGSecondSem2024 = require('../models/UGSecondSem2024');
const { UGSecondSem2025, UGFourthSem2024 } = require('../models/SemesterJsonCollections');
const PGFirstSem2025 = require('../models/PGFirstSem2025');
const PGSecondSem2025 = require('../models/PGSecondSem2025');
const { rollNumberQuery, formatAdmitCardData } = require('./studentLookup');

const getPg2ndSem2025LayoutKey = (student) => {
  const dept = String(student?.Department || '').trim().toUpperCase();
  if (dept === 'CHEMISTRY') return 'pg2ndsem2025-chemistry';
  if (dept === 'COMMERCE')  return 'pg2ndsem2025-commerce';
  if (dept === 'GEOLOGY')   return 'pg2ndsem2025-geology';
  if (dept === 'MATH')      return 'pg2ndsem2025-math';
  if (dept === 'ODIA')      return 'pg2ndsem2025-odia';
  return 'pg2ndsem2025-mfc'; // MFC students: no Department, Stream=COMMERCE
};

const ALL_PG2ND2025_FIELDS = ['CH-408', 'PAPER-2.1', 'MTC-201', 'PAPER-1.1'];

const isBbaStudent = (student) => {
  const dept = String(student?.Department || '').trim().toUpperCase();
  const roll = String(student?.['Roll No'] || '').trim().toUpperCase();
  return dept === 'BBA' || dept === 'BBA ' || roll.startsWith('BBA-') || student?.Stream === 'BBA';
};

const hasAnyField = (student, fields) =>
  fields.some((field) => {
    const value = student?.[field];
    if (value === undefined || value === null) return false;
    if (typeof value === 'object') {
      return !!(value.Subject || value.subject || value.name);
    }
    return String(value).trim() !== '';
  });

const SUBJECT_LAYOUTS = {
  '1stsem2025-ug': [
    'Core-1-Major-1',
    'Core-1-Major-2',
    'Core-2-Minor-1',
    'Multidisciplinary-1',
    'AEC-I',
    'VAC-I',
  ],
  '1stsem2025-bba': ['CC-101', 'CC-102', 'CC-103', 'MDE-101', 'AEC-101', 'AEC-102', 'VAC-101'],
  '2ndsem2025-ug': [
    'Core-1-Major-3',
    'Core-1-Major-4',
    'Core-2-Minor-2',
    'Multidisciplinary-2',
    'AEC-2',
    'SECC-I',
  ],
  '2ndsem2024-ug': [
    'Major-3',
    'Major-4',
    'MINOR-2(20)',
    'Multi Disciplinary-2',
    'AEC-2',
    'SEC-I',
  ],
  '2ndsem2024-bba': [
    'CC-201',
    'CC-202',
    'CC-203',
    'Multi Disciplinary-201',
    'AEC-201',
    'SEC-201',
    'VAC-201-I.C',
  ],
  '3rdsem-ug': [
    'Major-CP-5',
    'Major-CP-6',
    'Major-CP-7',
    'MINOR-3',
    'Multi Disciplinary-3',
    'VAC-2',
  ],
  '3rdsem-bba': ['CC-301', 'CC-302', 'CC-303', 'MDE-301', 'SEC-301', 'VAC-301'],
  '4thsem2024-ug': ['CORE-1 MAJOR-8', 'CORE-1 MAJOR-9', 'CORE-1 MAJOR-10', 'CORE-2 MINOR-4'],

  // PG 1st Semester 2025
  'pg1stsem2025-paper': ['PAPER-1.1', 'PAPER-1.2', 'PAPER-1.3', 'PAPER-1.4', 'PAPER-1.5', 'PAPER-1.6', 'PAPER-1.7'],
  'pg1stsem2025-mtc':   ['PAPER-MTC-101', 'PAPER-MTC-102', 'PAPER-MTC-103', 'PAPER-MTC-104', 'PAPER-MTC-105'],

  // PG 2nd Semester 2025 — one layout per department
  'pg2ndsem2025-chemistry': ['CH-408', 'CH-409', 'CH-410', 'CH-411', 'CH-412', 'CH-413', 'CH-414'],
  'pg2ndsem2025-commerce':  ['PAPER-2.1', 'PAPER-2.2', 'PAPER-2.3', 'PAPER-2.4', 'PAPER-2.5', 'PAPER-2.6'],
  'pg2ndsem2025-geology':   ['PAPER-2.1', 'PAPER-2.2', 'PAPER-2.3', 'PAPER-2.4', 'PAPER-2.5'],
  'pg2ndsem2025-math':      ['MTC-201', 'MTC-202', 'MTC-203', 'MTC-204', 'MTC-205'],
  'pg2ndsem2025-odia':      ['PAPER-2.1', 'PAPER-2.2', 'PAPER-2.3', 'PAPER-2.4'],
  'pg2ndsem2025-mfc':       ['PAPER-1.1', 'PAPER-1.2', 'PAPER-1.3', 'PAPER-1.4', 'PAPER-1.5', 'PAPER-1.6', 'PAPER-1.7', 'PAPER-1.8'],
};

const SUBJECT_FIELD_LABELS = {
  '1stsem2025-ug': {
    'Core-1-Major-1': 'Major CP-1',
    'Core-1-Major-2': 'Major CP-2',
    'Core-2-Minor-1': 'Minor P-1',
    'Multidisciplinary-1': 'MDC-1',
    'AEC-I': 'AEC-I',
    'VAC-I': 'VAC-I',
  },
  '1stsem2025-bba': {
    'CC-101': 'CC-101',
    'CC-102': 'CC-102',
    'CC-103': 'CC-103',
    'MDE-101': 'MDE-101',
    'AEC-101': 'AEC-101',
    'AEC-102': 'AEC-102',
    'VAC-101': 'VAC-101',
  },
  '2ndsem2025-ug': {
    'Core-1-Major-3': 'Major CP-3',
    'Core-1-Major-4': 'Major CP-4',
    'Core-2-Minor-2': 'Minor P-2',
    'Multidisciplinary-2': 'MDC-2',
    'AEC-2': 'AEC-2',
    'SECC-I': 'SEC-I',
  },
  '2ndsem2024-ug': {
    'Major-3': 'Major CP-3',
    'Major-4': 'Major CP-4',
    'MINOR-2(20)': 'Minor P-2',
    'Multi Disciplinary-2': 'MDC-2',
    'AEC-2': 'AEC-2',
    'SEC-I': 'SEC-I',
  },
  '2ndsem2024-bba': {
    'CC-201': 'CC-201',
    'CC-202': 'CC-202',
    'CC-203': 'CC-203',
    'Multi Disciplinary-201': 'MDC-201',
    'AEC-201': 'AEC-201',
    'SEC-201': 'SEC-201',
    'VAC-201-I.C': 'VAC-201',
  },
  '3rdsem-ug': {
    'Major-CP-5': 'Major CP-5',
    'Major-CP-6': 'Major CP-6',
    'Major-CP-7': 'Major CP-7',
    'MINOR-3': 'Minor P-3',
    'Multi Disciplinary-3': 'MDC-3',
    'VAC-2': 'VAC-2',
  },
  '3rdsem-bba': {
    'CC-301': 'CC-301',
    'CC-302': 'CC-302',
    'CC-303': 'CC-303',
    'MDE-301': 'MDE-301',
    'SEC-301': 'SEC-301',
    'VAC-301': 'VAC-301',
  },
  '4thsem2024-ug': {
    'CORE-1 MAJOR-8': 'Major CP-8',
    'CORE-1 MAJOR-9': 'Major CP-9',
    'CORE-1 MAJOR-10': 'Major CP-10',
    'CORE-2 MINOR-4': 'Minor P-4',
  },

  // PG 1st Semester 2025
  'pg1stsem2025-paper': {
    'PAPER-1.1': 'PAPER-1.1', 'PAPER-1.2': 'PAPER-1.2', 'PAPER-1.3': 'PAPER-1.3',
    'PAPER-1.4': 'PAPER-1.4', 'PAPER-1.5': 'PAPER-1.5', 'PAPER-1.6': 'PAPER-1.6',
    'PAPER-1.7': 'PAPER-1.7',
  },
  'pg1stsem2025-mtc': {
    'PAPER-MTC-101': 'PAPER-MTC-101', 'PAPER-MTC-102': 'PAPER-MTC-102',
    'PAPER-MTC-103': 'PAPER-MTC-103', 'PAPER-MTC-104': 'PAPER-MTC-104',
    'PAPER-MTC-105': 'PAPER-MTC-105',
  },

  // PG 2nd Semester 2025
  'pg2ndsem2025-chemistry': {
    'CH-408': 'CH-408', 'CH-409': 'CH-409', 'CH-410': 'CH-410',
    'CH-411': 'CH-411', 'CH-412': 'CH-412', 'CH-413': 'CH-413', 'CH-414': 'CH-414',
  },
  'pg2ndsem2025-commerce': {
    'PAPER-2.1': 'PAPER-2.1', 'PAPER-2.2': 'PAPER-2.2', 'PAPER-2.3': 'PAPER-2.3',
    'PAPER-2.4': 'PAPER-2.4', 'PAPER-2.5': 'PAPER-2.5', 'PAPER-2.6': 'PAPER-2.6',
  },
  'pg2ndsem2025-geology': {
    'PAPER-2.1': 'PAPER-2.1', 'PAPER-2.2': 'PAPER-2.2', 'PAPER-2.3': 'PAPER-2.3',
    'PAPER-2.4': 'PAPER-2.4', 'PAPER-2.5': 'PAPER-2.5',
  },
  'pg2ndsem2025-math': {
    'MTC-201': 'MTC-201', 'MTC-202': 'MTC-202', 'MTC-203': 'MTC-203',
    'MTC-204': 'MTC-204', 'MTC-205': 'MTC-205',
  },
  'pg2ndsem2025-odia': {
    'PAPER-2.1': 'PAPER-2.1', 'PAPER-2.2': 'PAPER-2.2',
    'PAPER-2.3': 'PAPER-2.3', 'PAPER-2.4': 'PAPER-2.4',
  },
  'pg2ndsem2025-mfc': {
    'PAPER-1.1': 'PAPER-1.1', 'PAPER-1.2': 'PAPER-1.2', 'PAPER-1.3': 'PAPER-1.3',
    'PAPER-1.4': 'PAPER-1.4', 'PAPER-1.5': 'PAPER-1.5', 'PAPER-1.6': 'PAPER-1.6',
    'PAPER-1.7': 'PAPER-1.7', 'PAPER-1.8': 'PAPER-1.8',
  },
};

const SEMESTER_SOURCES = [
  {
    key: '1stsem2025',
    label: '1st Semester',
    order: 1,
    studentType: 'UG2025',
    fetch: (query) => UGFirstSem2025.findOne(query),
    layoutKey: (student) => (isBbaStudent(student) ? '1stsem2025-bba' : '1stsem2025-ug'),
    detect: (student) => hasAnyField(student, SUBJECT_LAYOUTS['1stsem2025-ug']) || hasAnyField(student, SUBJECT_LAYOUTS['1stsem2025-bba']),
  },
  {
    key: '2ndsem2025',
    label: '2nd Semester (2025 Batch)',
    order: 2,
    studentType: 'UG2ND2025',
    fetch: (query) => UGSecondSem2025.findOne(query),
    layoutKey: () => '2ndsem2025-ug',
    detect: (student) => hasAnyField(student, SUBJECT_LAYOUTS['2ndsem2025-ug']),
  },
  {
    key: '2ndsem2024',
    label: '2nd Semester (2024 Batch)',
    order: 2,
    studentType: 'UG2ND2024',
    fetch: (query) => UGSecondSem2024.findOne(query),
    layoutKey: (student) => (isBbaStudent(student) ? '2ndsem2024-bba' : '2ndsem2024-ug'),
    detect: (student) =>
      hasAnyField(student, SUBJECT_LAYOUTS['2ndsem2024-ug']) ||
      hasAnyField(student, SUBJECT_LAYOUTS['2ndsem2024-bba']),
  },
  {
    key: '3rdsem',
    label: '3rd Semester',
    order: 3,
    studentType: 'UG',
    fetch: async (query) => {
      const bba = await BBAStudent.findOne(query);
      if (bba && (isBbaStudent(bba) || hasAnyField(bba, SUBJECT_LAYOUTS['3rdsem-bba']))) {
        return bba;
      }
      return UGStudent.findOne(query);
    },
    layoutKey: (student) => (isBbaStudent(student) ? '3rdsem-bba' : '3rdsem-ug'),
    detect: (student) =>
      hasAnyField(student, SUBJECT_LAYOUTS['3rdsem-ug']) ||
      hasAnyField(student, SUBJECT_LAYOUTS['3rdsem-bba']),
  },
  {
    key: '4thsem2024',
    label: '4th Semester (2024 Batch)',
    order: 4,
    studentType: 'UG4TH2024',
    fetch: (query) => UGFourthSem2024.findOne(query),
    layoutKey: () => '4thsem2024-ug',
    detect: (student) => hasAnyField(student, SUBJECT_LAYOUTS['4thsem2024-ug']),
  },
  {
    key: 'pg1stsem2025',
    label: '1st Semester',
    order: 1,
    studentType: 'PG2025',
    fetch: (query) => PGFirstSem2025.findOne(query),
    layoutKey: (student) =>
      student?.['PAPER-MTC-101'] ? 'pg1stsem2025-mtc' : 'pg1stsem2025-paper',
    detect: (student) =>
      hasAnyField(student, ['PAPER-1.1', 'PAPER-MTC-101']),
  },
  {
    key: 'pg2ndsem2025',
    label: '2nd Semester',
    order: 2,
    studentType: 'PG2ND2025',
    fetch: (query) => PGSecondSem2025.findOne(query),
    layoutKey: (student) => getPg2ndSem2025LayoutKey(student),
    detect: (student) => hasAnyField(student, ALL_PG2ND2025_FIELDS),
  },
];

const STUDENT_TYPE_DEFAULT_SEMESTER = {
  UG2025: '1stsem2025',
  UG2ND2025: '2ndsem2025',
  UG2ND2024: '2ndsem2024',
  UG: '3rdsem',
  UG4TH2024: '4thsem2024',
  BBA: '3rdsem',
  PG2025: 'pg1stsem2025',
  PG2ND2025: 'pg2ndsem2025',
};

const resolveFieldValue = (student, field) => {
  const value = student?.[field];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return value.Subject || value.subject || value.name || '';
  }
  return String(value).trim();
};

const buildSubjectRows = (student, layoutKey) => {
  const fields = SUBJECT_LAYOUTS[layoutKey] || [];
  const labels = SUBJECT_FIELD_LABELS[layoutKey] || {};

  return fields.map((field) => ({
    field,
    label: labels[field] || field,
    value: resolveFieldValue(student, field),
  }));
};

const listAvailableSemesters = async (autonomousRollNo) => {
  const query = rollNumberQuery(autonomousRollNo.trim());
  const available = [];

  for (const source of SEMESTER_SOURCES) {
    const student = await source.fetch(query);
    if (!student) continue;

    const plain = typeof student.toObject === 'function' ? student.toObject() : student;
    if (!source.detect(plain)) continue;

    available.push({
      key: source.key,
      label: source.label,
      order: source.order,
      studentType: source.studentType,
      student: plain,
      layoutKey: source.layoutKey(plain),
    });
  }

  return available.sort((a, b) => a.order - b.order);
};

const pickSemester = (available, semesterKey, preferredStudentType) => {
  if (semesterKey) {
    return available.find((item) => item.key === semesterKey) || null;
  }

  const preferredKey = STUDENT_TYPE_DEFAULT_SEMESTER[preferredStudentType?.toUpperCase()];
  if (preferredKey) {
    const preferred = available.find((item) => item.key === preferredKey);
    if (preferred) return preferred;
  }

  return available[0] || null;
};

const getAdmitCardData = async (autonomousRollNo, options = {}) => {
  const { semesterKey = null, studentType: preferredStudentType = null } = options;
  const available = await listAvailableSemesters(autonomousRollNo);

  if (available.length === 0) {
    return null;
  }

  const selected = pickSemester(available, semesterKey, preferredStudentType);
  if (!selected) {
    return { notFound: true, availableSemesters: available.map((s) => ({ key: s.key, label: s.label })) };
  }

  const formatted = await formatAdmitCardData(selected.student, selected.studentType);

  return {
    ...formatted,
    semesterKey: selected.key,
    semesterLabel: selected.label,
    subjects: buildSubjectRows(selected.student, selected.layoutKey),
    availableSemesters: available.map((s) => ({ key: s.key, label: s.label })),
  };
};

module.exports = {
  SUBJECT_LAYOUTS,
  SUBJECT_FIELD_LABELS,
  SEMESTER_SOURCES,
  listAvailableSemesters,
  getAdmitCardData,
  buildSubjectRows,
};
