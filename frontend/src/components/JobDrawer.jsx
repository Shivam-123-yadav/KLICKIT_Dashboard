import { formatDateDisplay } from "../utils/dates";
import { normalizeAdvancePaid, normalizeStatus, advanceClassFor } from "../utils/jobHelpers";
import { getCurrentUserRole, isCurrentUserAdmin } from "../utils/auth";

export default function JobDrawer({ job, onClose, onEdit, onDelete }) {
  const open = Boolean(job);

  let repairStatus = "—";
  if (job && job.status === "Closed") {
    repairStatus = job.isRepaired ? "✅ Repaired" : "❌ Unrepaired";
  }

  const normalizedAdvance = job ? normalizeAdvancePaid(job.advancePaid) : null;
  const advanceClass = advanceClassFor(normalizedAdvance);

  const isViewer = getCurrentUserRole() === "viewer";
  const isAdmin = isCurrentUserAdmin();

  return (
    <>
      <div className={`drawer-backdrop${open ? " is-open" : ""}`} id="drawerBackdrop" onClick={onClose}></div>
      <aside className={`drawer${open ? " is-open" : ""}`} id="drawer">
        <div className="drawer__head">
          <div>
            <p className="drawer__eyebrow" id="drawerJobNo">
              {job ? `JOB SHEET · ${job.jobNo}` : "JOB SHEET"}
            </p>
            <h2 id="drawerCustomer">{job ? `Branch · ${job.branch}` : "\u2014"}</h2>
          </div>
          <div className="drawer__head-actions">
            <button
              className="btn btn--secondary"
              id="drawerEdit"
              style={{ display: isViewer ? "none" : "inline-flex" }}
              onClick={() => job && onEdit(job)}
              type="button"
            >
              Edit
            </button>
            <button
              className="btn btn--danger"
              id="drawerDelete"
              style={{ display: isAdmin && !isViewer ? "inline-flex" : "none" }}
              onClick={onDelete}
              type="button"
            >
              Delete
            </button>
            <button className="icon-btn" id="drawerClose" aria-label="Close" onClick={onClose} type="button">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="drawer__body" id="drawerBody">
          {job && (
            <div className="dgroup">
              <div className="dgroup__title">Job details</div>
              <div className="dgrid" style={{ marginTop: 14 }}>
                <div className="dfield">
                  <div className="dfield__label">Submission date</div>
                  <div className="dfield__value mono">{formatDateDisplay(job.createdDate)}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Branch</div>
                  <div className="dfield__value">{job.branch}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Assigned by</div>
                  <div className="dfield__value">{job.assignedBy || "—"}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Status</div>
                  <div className="dfield__value">{normalizeStatus(job.status)}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Submit ETA</div>
                  <div className="dfield__value mono">{formatDateDisplay(job.eta)}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Approved Rejected ETA</div>
                  <div className="dfield__value mono">{job.approvedEta ? formatDateDisplay(job.approvedEta) : "—"}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Advance Paid</div>
                  <div className={`dfield__value ${advanceClass}`}>{normalizedAdvance || "—"}</div>
                </div>
                <div className="dfield">
                  <div className="dfield__label">Repair Status</div>
                  <div className="dfield__value">{repairStatus}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
