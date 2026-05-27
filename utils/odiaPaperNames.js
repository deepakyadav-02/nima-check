/** ODIA PG paper abbreviations → full titles */

const { getPaperCode, getPaperTitle, stripLegacyPaperFields } = require('./pgSubjectPaper');

const ODIA_SEM2 = {
  BB: 'BHASA BIGYANA',
  OSI: 'ODIA SAHITYARA ITIHAS',
  ONS: 'ODIA NATYA SAHITYA',
  TSSAS: 'TULANATAMAKA SAHITYA, SAMIKHYATATWA O ANUBADA SAHITYA',
};

const ODIA_SEM3 = {
  'VT-I': 'BHASA TATWA-I',
  'VT-1': 'BHASA TATWA-I',
  'VT-II': 'BHASA TATWA-II',
  'VT-2': 'BHASA TATWA-II',
  RMNT: 'RANGA MANCHA O NATYA TATWA',
  NN: 'NATAKA O NATYAKARA',
  AKK: 'ADHUNIKA KABYA KABITA-II',
  AGS: 'ADHUNIKA GADYA SAHITYA',
};

const ODIA_SEM4 = {
  LS: 'LOKA SAHITYA',
  GP: 'GABESANA PADHATI',
  GN: 'DISSERTATION - GABESANA NIBANDHA',
  SEMINAR: 'SEMINAR PRESENTATION WITH VIVA',
};

const ODIA_PAPER_KEY_BY_ABBREV = {
  2: {
    BB: 'PAPER2.1',
    OSI: 'PAPER2.2',
    ONS: 'PAPER2.3',
    TSSAS: 'PAPER2.4',
  },
  3: {
    'VT-I': 'PAPER3.1',
    'VT-1': 'PAPER3.1',
    'VT-II': 'PAPER3.2',
    'VT-2': 'PAPER3.2',
    RMNT: 'PAPER3.3',
    NN: 'PAPER3.4',
    AKK: 'PAPER3.5',
    AGS: 'PAPER3.6',
  },
  4: {
    LS: 'PAPER4.1',
    GP: 'PAPER4.2',
    GN: 'PAPER4.3',
    SEMINAR: 'PAPER4.4',
  },
};

const SEM_MAPS = { 2: ODIA_SEM2, 3: ODIA_SEM3, 4: ODIA_SEM4 };

const isPaperKey = (value) => {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^paper\d+\.\d+$/i.test(s.replace(/\s/g, ''))) return true;
  if (/^paper\s+\d+\.\d+$/i.test(s)) return true;
  return false;
};

const isBarePaper = (value) => /^paper$/i.test(String(value || '').trim());

const normalizePaperKey = (value) => {
  const compact = String(value || '').trim().replace(/\s/g, '');
  const m = compact.match(/^paper(\d+)\.(\d+)$/i);
  if (m) return `PAPER${m[1]}.${m[2]}`;
  return String(value || '').trim();
};

const normalizeKey = (value) => {
  if (value == null || value === '') return '';
  return String(value).trim().toUpperCase().replace(/\s+/g, '');
};

const normalizeAbbrev = (raw) => {
  let key = String(raw || '').trim().toUpperCase();
  if (!key) return '';
  key = key.replace(/\s+/g, '');
  if (key === 'VT1' || key === 'VT-I' || key === 'VT-1') return 'VT-I';
  if (key === 'VT2' || key === 'VT-II' || key === 'VT-2') return 'VT-II';
  return key;
};

const lookupInMap = (map, raw) => {
  if (!raw) return null;
  const key = normalizeAbbrev(raw);
  if (map[key]) return map[key];
  return map[normalizeKey(raw)] || null;
};

const resolveOdiaFullName = (semester, subject) => {
  const map = SEM_MAPS[semester];
  if (!map || !subject) return null;

  for (const c of [getPaperTitle(subject), getPaperCode(subject)]) {
    if (!c || isPaperKey(c) || isBarePaper(c)) continue;
    const full = lookupInMap(map, c);
    if (full) return full;
  }

  const name = getPaperTitle(subject);
  const values = Object.values(map);
  if (values.some((v) => v.toUpperCase() === name.toUpperCase())) return name;

  return null;
};

const getShortAbbrev = (semester, subject) => {
  const map = SEM_MAPS[semester];
  if (!map || !subject) return null;

  for (const c of [getPaperTitle(subject), getPaperCode(subject)]) {
    if (!c || isPaperKey(c) || isBarePaper(c)) continue;
    const key = normalizeAbbrev(c);
    if (map[key]) {
      if (key === 'VT1') return 'VT-I';
      if (key === 'VT2') return 'VT-II';
      return key;
    }
  }
  return null;
};

const resolvePaperKeyByFullName = (semester, fullName) => {
  const titleMap = SEM_MAPS[semester];
  const keyMap = ODIA_PAPER_KEY_BY_ABBREV[semester];
  if (!titleMap || !keyMap || !fullName) return null;

  const target = fullName.trim().toUpperCase();
  for (const [abbrev, paperKey] of Object.entries(keyMap)) {
    const title = titleMap[abbrev] || titleMap[normalizeAbbrev(abbrev)];
    if (title && title.toUpperCase() === target) return paperKey;
  }
  return null;
};

const resolvePaperKey = (semester, subject, abbrev, fullName) => {
  const code = getPaperCode(subject);
  if (isPaperKey(code)) return normalizePaperKey(code);

  const keyMap = ODIA_PAPER_KEY_BY_ABBREV[semester];
  if (abbrev && keyMap) {
    const k = normalizeAbbrev(abbrev);
    if (keyMap[k]) return keyMap[k];
  }

  if (fullName) {
    const fromTitle = resolvePaperKeyByFullName(semester, fullName);
    if (fromTitle) return fromTitle;
  }

  return isPaperKey(code) ? normalizePaperKey(code) : code || null;
};

/**
 * paper: { code: "PAPER3.1", title: "BHASA TATWA-I" }
 */
const applyOdiaFullNameToSubject = (semester, subject) => {
  const full = resolveOdiaFullName(semester, subject);
  if (!full) return subject;

  const abbrev = getShortAbbrev(semester, subject);
  const paperKey = resolvePaperKey(semester, subject, abbrev, full);
  const code = paperKey || getPaperCode(subject);

  return {
    ...stripLegacyPaperFields(subject),
    paper: { code, title: full },
  };
};

const isOdiaDepartment = (department) =>
  String(department || '')
    .trim()
    .toUpperCase()
    .includes('ODIA');

module.exports = {
  ODIA_SEM2,
  ODIA_SEM3,
  ODIA_SEM4,
  ODIA_PAPER_KEY_BY_ABBREV,
  resolveOdiaFullName,
  getShortAbbrev,
  resolvePaperKey,
  applyOdiaFullNameToSubject,
  isOdiaDepartment,
};
