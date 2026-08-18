import { useEffect, useState } from "react";
import { BRANCHES } from "../utils/constants";
import { formatDateInput } from "../utils/dates";
import { normalizeAdvancePaid } from "../utils/jobHelpers";
import { fetchEmployees } from "../utils/api";
import { getCurrentUserBranch, getCurrentUserRole, getVisibleBranches } from "../utils/auth";

const today = () => new Date().toISOString().slice(0, 10);

function defaultFormState() {
  return {
    submissionDate: today(),
    eta: today(),
    branch: "",
    jobSheet: "",
    advancePaid: "Unpaid",
    assignedBy: "",
    approvedEta: "",
    status: "Pending",
    repairState: null, // true | false | null
  };
}

export default function JobFormModal({ open, job, onClose, onSubmit, onValidationError }) {
  const [form, setForm] = useState(defaultFormState);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const role = getCurrentUserRole();
  const userBranch = getCurrentUserBranch();
  const visibleBranches = getVisibleBranches();
  const branchOptions = role === "admin" ? BRANCHES : visibleBranches;

  const isEdit = Boolean(job);

  // Reset form whenever the modal opens (for either create or edit)
  useEffect(() => {
    if (!open) return;

    if (job) {
      setForm({
        submissionDate: formatDateInput(job.createdDate),
        eta: formatDateInput(job.eta),
        branch: job.branch,
        jobSheet: job.jobNo,
        advancePaid: normalizeAdvancePaid(job.advancePaid) || "Unpaid",
        assignedBy: job.assignedBy || "",
        approvedEta: job.approvedEta ? formatDateInput(job.approvedEta) : "",
        status: job.status,
        repairState: job.isRepaired !== undefined && job.isRepaired !== null ? job.isRepaired : null,
      });
    } else {
      let initialBranch = branchOptions[0] || "";
      if (role === "admin") {
        initialBranch = branchOptions.includes("Andheri") ? "Andheri" : branchOptions[0] || "";
      } else if (userBranch && visibleBranches.includes(userBranch)) {
        initialBranch = userBranch;
      }
      setForm({ ...defaultFormState(), branch: initialBranch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job]);

  // Load employees whenever the branch changes (mirrors populateAssignedByOptions)
  useEffect(() => {
    if (!open || !form.branch) return;
    let cancelled = false;
    setEmployeesLoading(true);
    fetchEmployees(form.branch)
      .then((list) => {
        if (cancelled) return;
        setEmployees(list);
        const selected = isEdit ? form.assignedBy : "";
        if (selected && list.some((e) => e.username === selected)) {
          setForm((prev) => ({ ...prev, assignedBy: selected }));
        } else if (list.length === 1) {
          setForm((prev) => ({ ...prev, assignedBy: list[0].username }));
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.branch]);

  if (!open) return null;

  const disabled = isEdit
    ? { submissionDate: true, eta: true, branch: true, jobSheet: true, advancePaid: false, status: false, approvedEta: false }
    : { submissionDate: false, eta: false, branch: false, jobSheet: false, advancePaid: false, status: true, approvedEta: true };

  const showRepair = form.status === "Closed";

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.status === "Closed" && form.repairState === null) {
      onValidationError?.("Select Repaired or Unrepaired before saving Closed jobs.");
      return;
    }

    const payload = {
      jobNo: form.jobSheet.trim(),
      createdDate: form.submissionDate,
      branch: form.branch,
      assignedBy: (form.assignedBy || "").trim(),
      status: form.status,
      eta: form.eta,
      approvedEta: form.approvedEta.trim() ? form.approvedEta.trim() : null,
      advancePaid: form.advancePaid,
      isRepaired: form.status === "Closed" ? form.repairState : null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload, isEdit ? job.id : null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop is-open" id="formBackdrop" onClick={onClose}></div>
      <div className="job-form-modal is-open" id="jobFormModal" role="dialog" aria-modal="true" aria-labelledby="jobFormTitle">
        <div className="job-form-modal__head">
          <div>
            <p className="job-form-modal__eyebrow">{isEdit ? "Edit job sheet" : "New job sheet"}</p>
            <h3 id="jobFormTitle">{isEdit ? "Edit job sheet" : "Create job sheet"}</h3>
          </div>
          <button className="icon-btn job-form-modal__close" id="formClose" aria-label="Close form" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="job-form" id="newJobForm" onSubmit={handleSubmit}>
          <div className="job-form__grid">
            {/* Column 1 */}
            <div className="job-form__col">
              <label className="field">
                <span>Submission date</span>
                <input
                  type="date"
                  name="submissionDate"
                  required
                  disabled={disabled.submissionDate}
                  value={form.submissionDate}
                  onChange={(e) => setField("submissionDate", e.target.value)}
                />
              </label>

              <label className="field">
                <span>Submit ETA</span>
                <input
                  type="date"
                  name="eta"
                  required
                  disabled={disabled.eta}
                  value={form.eta}
                  onChange={(e) => setField("eta", e.target.value)}
                />
              </label>

              <label className="field">
                <span>Branch</span>
                <select
                  name="branch"
                  required
                  disabled={disabled.branch}
                  value={form.branch}
                  onChange={(e) => setField("branch", e.target.value)}
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Job Sheet</span>
                <input
                  type="text"
                  name="jobSheet"
                  placeholder="e.g. 20320018110"
                  required
                  disabled={disabled.jobSheet}
                  value={form.jobSheet}
                  onChange={(e) => setField("jobSheet", e.target.value)}
                />
              </label>

              <label className="field">
                <span>Advance Paid</span>
                <select
                  name="advancePaid"
                  required
                  disabled={disabled.advancePaid}
                  value={form.advancePaid}
                  onChange={(e) => setField("advancePaid", e.target.value)}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="NA">NA</option>
                </select>
              </label>
            </div>

            {/* Column 2 */}
            <div className="job-form__col">
              <label className="field">
                <span>Attend By</span>
                <select
                  name="assignedBy"
                  disabled={employeesLoading}
                  value={form.assignedBy}
                  onChange={(e) => setField("assignedBy", e.target.value)}
                >
                  {employeesLoading ? (
                    <option value="">Loading employees…</option>
                  ) : (
                    <>
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.username} value={emp.username}>
                          {emp.fullName || emp.username}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>

              <label className="field">
                <span>Approved Rejected ETA</span>
                <input
                  type="date"
                  name="approvedEta"
                  disabled={disabled.approvedEta}
                  value={form.approvedEta}
                  onChange={(e) => setField("approvedEta", e.target.value)}
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  name="status"
                  required
                  disabled={disabled.status}
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved Pending">For Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Ready">Ready</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              {/* Repair state: show only for Closed status, with exactly one option selected */}
              <div className="field" id="repairCheckboxContainer" style={{ display: showRepair ? "flex" : "none", flexDirection: "column", marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Repair status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 500 }}>
                    <input
                      type="radio"
                      name="repairState"
                      value="true"
                      id="repairCheckboxTrue"
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                      checked={form.repairState === true}
                      onChange={() => setField("repairState", true)}
                    />
                    <span>✅ Repaired</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 500 }}>
                    <input
                      type="radio"
                      name="repairState"
                      value="false"
                      id="repairCheckboxFalse"
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                      checked={form.repairState === false}
                      onChange={() => setField("repairState", false)}
                    />
                    <span>❌ Unrepaired</span>
                  </label>
                </div>
                <small style={{ color: "var(--text-faint)", display: "block", marginTop: 8, fontSize: 12 }}>
                  Select one option for Closed jobs
                </small>
              </div>
            </div>
          </div>

          <div className="job-form__actions">
            <button type="button" className="btn" id="cancelJobForm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Save job sheet"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
