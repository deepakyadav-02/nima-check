const { applyOdiaFullNameToSubject, isOdiaDepartment } = require('./odiaPaperNames');
const { applyChemistryFullNameToSubject, isChemistryDepartment } = require('./chemistryPaperNames');
const { applyGeologyFullNameToSubject, isGeologyDepartment } = require('./geologyPaperNames');
const {
  applyMathematicsFullNameToSubject,
  isMathematicsDepartment,
} = require('./mathematicsPaperNames');
const { applyCommerceFullNameToSubject, isCommerceDepartment } = require('./commercePaperNames');

const expandDepartmentSubjects = (subjects, semester, department) => {
  if (isOdiaDepartment(department)) {
    return subjects.map((s) => applyOdiaFullNameToSubject(semester, s));
  }
  if (isChemistryDepartment(department)) {
    return subjects.map((s) => applyChemistryFullNameToSubject(semester, s));
  }
  if (isGeologyDepartment(department)) {
    return subjects.map((s) => applyGeologyFullNameToSubject(semester, s));
  }
  if (isMathematicsDepartment(department)) {
    return subjects.map((s) => applyMathematicsFullNameToSubject(semester, s));
  }
  if (isCommerceDepartment(department)) {
    return subjects.map((s) => applyCommerceFullNameToSubject(semester, s));
  }
  return subjects;
};

module.exports = { expandDepartmentSubjects };
