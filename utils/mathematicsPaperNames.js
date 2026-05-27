/** Mathematics PG paper codes → full titles (sem 2–4) */

const { getPaperCode, getPaperTitle, stripLegacyPaperFields } = require('./pgSubjectPaper');

const MATHEMATICS_SEM2 = {
  'MTC-201': 'FUNCTIONAL ANALYSIS',
  'MTC-202': 'DIFFERENTIAL EQUATION',
  'MTC-203': 'LINEAR ALGEBRA',
  'MTC-204': 'NUMERICAL OPTIMIZATION',
  'MTC-205': 'DATA BASE AND C++ LAB',
};

const MATHEMATICS_SEM3 = {
  'MTC-301': 'NUMERICAL ANALYSIS-I',
  'MTC-302': 'NUMBER THEORY AND CRYPTOGRAPHY-I',
  'MTC-303': 'STATISTICAL METHODS',
  'MTC-304': 'DISCRETE MATHEMATICS',
  'MTC-305': 'COMPUTATIONAL FLUID DYNAMICS-I',
};

const MATHEMATICS_SEM4 = {
  'MTC-401': 'NUMERICAL ANALYSIS-II',
  'MTC-402': 'NUMBER THEORY AND CRYPTOGRAPHY-II',
  'MTC-403':
    'ADVANCED ANALYSIS / COMPUTATIONAL FLUID DYNAMICS-II / THEORY OF OPTIMIZATION',
  'MTC-404': 'PROJECT',
};

/** Short titles stored in JSON / legacy imports */
const ABBREV_BY_SEM = {
  2: {
    FA: 'MTC-201',
    DE: 'MTC-202',
    LA: 'MTC-203',
    NOPT: 'MTC-204',
    DBCL: 'MTC-205',
  },
  3: {
    NA: 'MTC-301',
    NTC: 'MTC-302',
    SM: 'MTC-303',
    DM: 'MTC-304',
    CFD: 'MTC-305',
  },
  4: {
    'NA-II': 'MTC-401',
    'NAII': 'MTC-401',
    NTC: 'MTC-402',
    AA: 'MTC-403',
    PROJ: 'MTC-404',
    PROJECT: 'MTC-404',
  },
};

const SEM_MAPS = {
  2: MATHEMATICS_SEM2,
  3: MATHEMATICS_SEM3,
  4: MATHEMATICS_SEM4,
};

const normalizeMathCode = (raw) => {
  const s = String(raw || '').trim().toUpperCase();
  const compact = s.replace(/\s/g, '');
  const m = compact.match(/^MTC-?(\d{3})$/);
  if (m) return `MTC-${m[1]}`;
  return s;
};

const lookupTitle = (semester, rawCode) => {
  const map = SEM_MAPS[semester];
  if (!map || !rawCode) return null;
  const code = normalizeMathCode(rawCode);
  return map[code] || null;
};

const resolveCodeFromAbbrev = (semester, value) => {
  const abbrevMap = ABBREV_BY_SEM[semester];
  if (!abbrevMap || !value) return null;
  const key = String(value).trim().toUpperCase();
  return abbrevMap[key] || null;
};

const resolveMathematicsFullName = (semester, subject) => {
  const map = SEM_MAPS[semester];
  if (!map || !subject) return null;

  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const title = lookupTitle(semester, c);
    if (title) return title;
    const fromAbbrev = resolveCodeFromAbbrev(semester, c);
    if (fromAbbrev) return map[fromAbbrev];
  }

  const name = getPaperTitle(subject);
  if (Object.values(map).some((v) => v.toUpperCase() === name.toUpperCase())) return name;

  return null;
};

const resolveMathematicsPaperCode = (semester, subject) => {
  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const normalized = normalizeMathCode(c);
    if (lookupTitle(semester, normalized)) return normalized;
    const fromAbbrev = resolveCodeFromAbbrev(semester, c);
    if (fromAbbrev) return fromAbbrev;
  }

  const code = normalizeMathCode(getPaperCode(subject));
  const title = getPaperTitle(subject);
  const map = SEM_MAPS[semester];
  if (!map) return code;

  for (const [mtcCode, fullTitle] of Object.entries(map)) {
    if (fullTitle.toUpperCase() === title.toUpperCase()) return mtcCode;
  }
  return code;
};

const applyMathematicsFullNameToSubject = (semester, subject) => {
  const full = resolveMathematicsFullName(semester, subject);
  if (!full) return subject;

  const code = resolveMathematicsPaperCode(semester, subject);

  return {
    ...stripLegacyPaperFields(subject),
    paper: { code, title: full },
  };
};

const isMathematicsDepartment = (department) => {
  const d = String(department || '').trim().toUpperCase();
  return d.includes('MATH') || d === 'MATHEMATICS';
};

module.exports = {
  MATHEMATICS_SEM2,
  MATHEMATICS_SEM3,
  MATHEMATICS_SEM4,
  applyMathematicsFullNameToSubject,
  isMathematicsDepartment,
};
