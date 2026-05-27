/** Commerce PG paper keys → full titles (sem 2–4) */

const { getPaperCode, getPaperTitle, stripLegacyPaperFields } = require('./pgSubjectPaper');

const COMMERCE_SEM2 = {
  'PAPER2.1': 'BUSINESS ENVIRONMENT',
  'PAPER2.2': 'ORGANISATION BEHAVIOR',
  'PAPER2.3': 'MARKETING MANAGEMENT',
  'PAPER2.4': 'MANAGERIAL ECONOMICS',
  'PAPER2.5': 'SMALL BUSINESS MANAGEMENT',
  'PAPER2.6': 'SOCIAL SURVEY AND RESEARCH METHODOLOGY',
};

const COMMERCE_SEM3 = {
  'PAPER3.1': 'STRATEGIC MANAGEMENT',
  'PAPER3.2': 'FINANCIAL INSTITUTIONS & MARKETS',
  'PAPER3.3': 'MANAGEMENT OF PERSONAL FINANCES',
  'PAPER3.4': 'ADVANCED ACCOUNTING',
  'PAPER3.5': 'CORPORATE TAX PLANNING',
  'PAPER3.6': 'ADVANCED AUDITING',
};

const COMMERCE_SEM4 = {
  'PAPER4.1': 'PROJECT',
  'PAPER4.2': 'CORPORATE GOVERNANCE & BUSINESS ETHICS',
  'PAPER4.3': 'MANAGEMENT OF FINANCIAL INSTITUTIONS',
  'PAPER4.4': 'INTERNATIONAL ACCOUNTING',
  'PAPER4.5': 'ACCOUNTING STANDARDS & CORPORATE REPORTING',
  'PAPER4.6': 'ACCOUNTING FOR NPOS',
};

const ABBREV_BY_SEM = {
  2: {
    BE: 'PAPER2.1',
    OB: 'PAPER2.2',
    MM: 'PAPER2.3',
    ME: 'PAPER2.4',
    SBN: 'PAPER2.5',
    SSRM: 'PAPER2.6',
  },
  3: {
    SM: 'PAPER3.1',
    FIM: 'PAPER3.2',
    MPF: 'PAPER3.3',
    AA: 'PAPER3.4',
    CTP: 'PAPER3.5',
    AD: 'PAPER3.6',
  },
  4: {
    PROJ: 'PAPER4.1',
    PROS: 'PAPER4.1',
    CGBE: 'PAPER4.2',
    FMI: 'PAPER4.3',
    IA: 'PAPER4.4',
    ANPO: 'PAPER4.6',
    'AS&CR': 'PAPER4.5',
    'AS & CR': 'PAPER4.5',
  },
};

const SEM_MAPS = {
  2: COMMERCE_SEM2,
  3: COMMERCE_SEM3,
  4: COMMERCE_SEM4,
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

const resolveCodeFromAbbrev = (semester, value) => {
  const abbrevMap = ABBREV_BY_SEM[semester];
  if (!abbrevMap || !value) return null;
  const key = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const compact = key.replace(/\s/g, '');
  return abbrevMap[key] || abbrevMap[compact] || null;
};

const resolveCommerceFullName = (semester, subject) => {
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

const resolveCommercePaperCode = (semester, subject) => {
  for (const c of [getPaperCode(subject), getPaperTitle(subject)]) {
    const key = normalizePaperKey(c);
    if (lookupTitle(semester, key)) return key;
    const fromAbbrev = resolveCodeFromAbbrev(semester, c);
    if (fromAbbrev) return fromAbbrev;
  }
  return normalizePaperKey(getPaperCode(subject));
};

const applyCommerceFullNameToSubject = (semester, subject) => {
  const full = resolveCommerceFullName(semester, subject);
  if (!full) return subject;

  const code = resolveCommercePaperCode(semester, subject);

  return {
    ...stripLegacyPaperFields(subject),
    paper: { code, title: full },
  };
};

const isCommerceDepartment = (department) => {
  const d = String(department || '').trim().toUpperCase();
  return d.includes('COMMERCE') || d === 'COMM';
};

module.exports = {
  COMMERCE_SEM2,
  COMMERCE_SEM3,
  COMMERCE_SEM4,
  applyCommerceFullNameToSubject,
  isCommerceDepartment,
};
