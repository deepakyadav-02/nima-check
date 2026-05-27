/**
 * PG subject paper identity: one object for PAPERS (code) + PAPERS TITLE (title).
 * Example: { code: "PAPER3.1", title: "BHASA TATWA-I" }
 */

const getPaperCode = (subject) => {
  if (!subject) return '';
  if (subject.paper?.code) return String(subject.paper.code).trim();
  return String(subject.paperCode || subject.courseType || '').trim();
};

const getPaperTitle = (subject) => {
  if (!subject) return '';
  if (subject.paper?.title) return String(subject.paper.title).trim();
  return String(subject.paperName || subject.subjectName || '').trim();
};

const buildPaper = (code, title) => ({
  paper: {
    code: code != null ? String(code).trim() : '',
    title: title != null ? String(title).trim() : '',
  },
});

const stripLegacyPaperFields = (subject) => {
  const { paperCode, paperName, subjectName, courseType, paper, ...rest } = subject;
  return rest;
};

const toPaperSubject = (subject, code, title) => ({
  ...stripLegacyPaperFields(subject),
  ...buildPaper(code, title),
});

/** Convert legacy paperCode/paperName fields → paper: { code, title } */
const migrateSubjectToPaperShape = (subject) => {
  if (!subject || typeof subject !== 'object') return subject;
  const code = getPaperCode(subject);
  const title = getPaperTitle(subject);
  return toPaperSubject(subject, code, title);
};

module.exports = {
  getPaperCode,
  getPaperTitle,
  buildPaper,
  stripLegacyPaperFields,
  toPaperSubject,
  migrateSubjectToPaperShape,
};
