/** Chemistry PG paper codes → full titles (sem 2–4) */

const { getPaperCode, getPaperTitle, stripLegacyPaperFields } = require('./pgSubjectPaper');

const CHEMISTRY_SEM2 = {
  'CH-408': 'INORGANIC CHEMISTRY-II',
  'CH-409': 'ORGANIC CHEMISTRY-II',
  'CH-410': 'PHYSICAL CHEMISTRY-II',
  'CH-411': 'INORGANIC CHEMISTRY PRACTICAL-II',
  'CH-412': 'ORGANIC CHEMISTRY PRACTICAL-II',
  'CH-413': 'SPECTROSCOPY-I',
  'CH-414': 'ANALYTICAL CHEMISTRY',
};

const CHEMISTRY_SEM3 = {
  'CH-501': 'PERICYCLIC REACTIONS AND PHOTOCHEMISTRY',
  'CH-502': 'BIOINORGANIC & SUPRAMOLECULAR CHEMISTRY',
  'CH-503': 'APPLIED CHEMISTRY PRACTICAL-II',
  'CH-504': 'PHYSICAL CHEMISTRY PRACTICAL-II',
  'CH-505': 'APPLICATION OF SPECTROSCOPY-I',
  'CH-506': 'ORGANIC SYNTHESIS',
  'CH-507': 'ENVIRONMENTAL CHEMISTRY',
};

const CHEMISTRY_SEM4 = {
  'CH-508': 'BIOORGANIC CHEMISTRY',
  'CH-509': 'ORGANOTRANSITION METAL CHEMISTRY',
  'CH-510': 'POLYMER CHEMISTRY',
  'CH-511': 'SOLID STATE CHEMISTRY',
  'CH-512': 'PHYSICAL PRACTICAL-II',
  'CH-513': 'PROJECT WORK AND SEMINAR',
  'CH-514': 'APPLICATION OF SPECTROSCOPY-II',
};

const SEM_MAPS = {
  2: CHEMISTRY_SEM2,
  3: CHEMISTRY_SEM3,
  4: CHEMISTRY_SEM4,
};

const normalizeChemCode = (raw) => {
  const s = String(raw || '').trim().toUpperCase();
  const m = s.match(/^CH-?(\d{3})$/);
  if (m) return `CH-${m[1]}`;
  return s;
};

const lookupTitle = (semester, rawCode) => {
  const map = SEM_MAPS[semester];
  if (!map || !rawCode) return null;
  const code = normalizeChemCode(rawCode);
  return map[code] || null;
};

const resolveChemistryFullName = (semester, subject) => {
  const map = SEM_MAPS[semester];
  if (!map || !subject) return null;

  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const title = lookupTitle(semester, c);
    if (title) return title;
  }

  const name = getPaperTitle(subject);
  const values = Object.values(map);
  if (values.some((v) => v.toUpperCase() === name.toUpperCase())) return name;

  return null;
};

const resolveChemistryPaperCode = (semester, subject) => {
  const code = normalizeChemCode(getPaperCode(subject));
  if (lookupTitle(semester, code)) return code;

  const title = getPaperTitle(subject);
  const map = SEM_MAPS[semester];
  if (!map) return code;

  for (const [chCode, fullTitle] of Object.entries(map)) {
    if (fullTitle.toUpperCase() === title.toUpperCase()) return chCode;
  }
  return code;
};

/**
 * paper.code = CH-501, paper.title = full name
 */
const applyChemistryFullNameToSubject = (semester, subject) => {
  const full = resolveChemistryFullName(semester, subject);
  if (!full) return subject;

  const code = resolveChemistryPaperCode(semester, subject);

  return {
    ...stripLegacyPaperFields(subject),
    paper: { code, title: full },
  };
};

const isChemistryDepartment = (department) => {
  const d = String(department || '').trim().toUpperCase();
  return d.includes('CHEM');
};

module.exports = {
  CHEMISTRY_SEM2,
  CHEMISTRY_SEM3,
  CHEMISTRY_SEM4,
  applyChemistryFullNameToSubject,
  isChemistryDepartment,
};
