export function normalizeAdvancePaid(value) {
  // Ensure only "Paid", "Unpaid", or "NA" are displayed
  if (value === "Paid" || value === "Paid ") return "Paid";
  if (value === "Unpaid" || value === "Unpaid ") return "Unpaid";
  if (value === "NA" || value === "NA ") return "NA";
  // Convert numeric/boolean values from corrupted data
  if (value === "1" || value === 1 || value === true) return "Paid";
  if (value === "0" || value === 0 || value === false) return "Unpaid";
  // Default to Unpaid for any other value
  return value ? "Unpaid" : null;
}

export function normalizeStatus(value) {
  if (!value) return "";
  return String(value).trim();
}

export function repairStatusValue(job) {
  if (normalizeStatus(job.status) === "Closed" && job.isRepaired === true) return "Repaired";
  if (normalizeStatus(job.status) === "Closed" && job.isRepaired === false) return "Unrepaired";
  if (normalizeStatus(job.status) === "Rejected" && job.isRepaired === false) return "Unrepaired";
  if (normalizeStatus(job.status) === "Rejected" && job.isRepaired === true) return "Repaired";
  return "";
}

export function advanceClassFor(normalizedAdvance) {
  return normalizedAdvance === "Paid" ? "advance-paid" : normalizedAdvance === "Unpaid" ? "advance-unpaid" : "advance-na";
}
