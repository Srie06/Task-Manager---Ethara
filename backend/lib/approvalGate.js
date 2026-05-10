function passesApprovalGate(task) {
  const rationale = (task.rationale || "").trim();
  return (
    task.factuality_score != null &&
    task.helpfulness_score != null &&
    task.safety_score != null &&
    rationale.length >= 20 &&
    task.reviewed_by != null
  );
}

function assertScore(value, field) {
  if (value == null || Number.isNaN(Number(value))) {
    const err = new Error(`${field} is required and must be numeric`);
    err.status = 400;
    throw err;
  }
  const n = Number(value);
  if (n < 1 || n > 7) {
    const err = new Error(`${field} must be between 1 and 7`);
    err.status = 400;
    throw err;
  }
  return n;
}

module.exports = {
  passesApprovalGate,
  assertScore
};
