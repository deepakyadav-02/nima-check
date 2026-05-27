/** Geology PG paper keys → full titles (sem 2–4) */

const { getPaperCode, getPaperTitle, stripLegacyPaperFields } = require('./pgSubjectPaper');

const GEOLOGY_SEM2 = {
  'PAPER2.1': 'IGNEOUS PETROLOGY, SEDIMENTARY PETROLOGY AND BASIN ANALYSIS',
  'PAPER2.2': 'METAMORPHIC PETROLOGY AND APPLIED GEOCHEMISTRY',
  'PAPER2.3': 'APPLIED HYDROGEOLOGY AND ENGINEERING GEOLOGY',
  'PAPER2.4': 'PRACTICAL CORRESPONDING TO THEORY PAPER2.1, SEMINAR',
  'PAPER2.5': 'PRACTICAL CORRESPONDING TO THEORY PAPER 2.2, 2.3 & FIELD REPORT',
};

const GEOLOGY_SEM3 = {
  'PAPER3.1': 'STRUCTURAL GEOLOGY, GEODYNAMICS AND GEOMORPHOLOGY',
  'PAPER3.2': 'PALEONTOLOGY, APPLIED MICROPALENTOLOGY & QUATERNARY GEOLOGY',
  'PAPER3.3': 'STRATIGRAPHY, PALAEOGEOGRAPHY AND MARINE GEOSCIENCE',
  'PAPER3.4': 'GEOSTATISTICS AND COMPUTER APPLICATION IN GEOLOGY',
  'PAPER3.5': 'PRACTICAL',
};

const GEOLOGY_SEM4 = {
  'PAPER4.1': 'ORE GEOLOGY-I',
  'PAPER4.2': 'ORE GEOLOGY-II',
  'PAPER4.3': 'ORE GEOLOGY-III',
  'PAPER4.4': 'PRACTICAL',
  'PAPER4.5': 'PROJECT',
};

const SEM_MAPS = {
  2: GEOLOGY_SEM2,
  3: GEOLOGY_SEM3,
  4: GEOLOGY_SEM4,
};

const normalizePaperKey = (value) => {
  const s = String(value || '').trim();
  const m = s.match(/^paper\s*(\d+)\.(\d+)$/i);
  if (m) return `PAPER${m[1]}.${m[2]}`;
  const compact = s.replace(/\s/g, '').toUpperCase();
  if (/^PAPER\d+\.\d+$/i.test(compact)) return compact;
  return s;
};

const lookupTitle = (semester, rawKey) => {
  const map = SEM_MAPS[semester];
  if (!map || !rawKey) return null;
  const key = normalizePaperKey(rawKey);
  return map[key] || null;
};

const resolveGeologyFullName = (semester, subject) => {
  const map = SEM_MAPS[semester];
  if (!map || !subject) return null;

  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const title = lookupTitle(semester, c);
    if (title) return title;
  }

  const name = getPaperTitle(subject);
  if (Object.values(map).some((v) => v.toUpperCase() === name.toUpperCase())) return name;

  return null;
};

const resolveGeologyPaperCode = (semester, subject) => {
  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const key = normalizePaperKey(c);
    if (lookupTitle(semester, key)) return key;
  }
  return normalizePaperKey(getPaperCode(subject));
};

const applyGeologyFullNameToSubject = (semester, subject) => {
  const full = resolveGeologyFullName(semester, subject);
  if (!full) return subject;

  const code = resolveGeologyPaperCode(semester, subject);

  return {
    ...stripLegacyPaperFields(subject),
    paper: { code, title: full },
  };
};

const isGeologyDepartment = (department) => {
  const d = String(department || '').trim().toUpperCase();
  return d.includes('GEO');
};

module.exports = {
  GEOLOGY_SEM2,
  GEOLOGY_SEM3,
  GEOLOGY_SEM4,
  applyGeologyFullNameToSubject,
  isGeologyDepartment,
};
