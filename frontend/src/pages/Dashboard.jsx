import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import JobFormModal from "../components/JobFormModal";
import JobDrawer from "../components/JobDrawer";
import Toast, { useToast } from "../components/Toast";
import { BRANCHES, STATUS_META, branchSlug, ITEMS_PER_PAGE } from "../utils/constants";
import { parseDateString, isSameLocalDay, formatDateDisplay } from "../utils/dates";
import { normalizeAdvancePaid, normalizeStatus, repairStatusValue, advanceClassFor } from "../utils/jobHelpers";
import { fetchJobs, createJobAPI, updateJobAPI, deleteJobAPI } from "../utils/api";
import {
  getCurrentUserName,
  getCurrentUserRole,
  getVisibleBranches,
  isCurrentUserAdmin,
  isAuthenticated,
  logoutUser,
} from "../utils/auth";
import { useTheme } from "../utils/useTheme";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast, showToast } = useToast();

  const [jobs, setJobs] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [filters, setFilters] = useState({ branch: "All", status: "All", eta: "All", submissionDate: "", query: "" });
  const [currentPage, setCurrentPage] = useState(0);

  const [drawerJob, setDrawerJob] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const role = getCurrentUserRole();
  const isAdmin = isCurrentUserAdmin();
  const isViewer = role === "viewer";
  const visibleBranches = getVisibleBranches();

  useEffect(() => {
    document.title = "KLICKIT \u00b7 Job Sheet Dashboard";
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const reloadJobs = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load job sheets:", err);
      showToast("Couldn't reach the backend — check the server is running.", true);
      setJobs([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) reloadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  // Snap the branch filter back to something valid whenever visibility changes
  useEffect(() => {
    if (filters.branch !== "All" && !visibleBranches.includes(filters.branch)) {
      setFilters((prev) => ({ ...prev, branch: role === "admin" ? "All" : visibleBranches[0] || "All" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return jobs.filter((j) => {
      const status = normalizeStatus(j.status);
      const repairStatus = repairStatusValue(j);

      if (filters.branch !== "All" && j.branch !== filters.branch) return false;

      if (filters.status !== "All") {
        if (filters.status === "Repaired" && repairStatus !== "Repaired") return false;
        if (filters.status === "Unrepaired" && repairStatus !== "Unrepaired") return false;
        if (filters.status !== "Repaired" && filters.status !== "Unrepaired" && status !== filters.status) return false;
      }

      const createdDate = parseDateString(j.createdDate);
      const etaDate = parseDateString(j.eta);

      if (filters.submissionDate) {
        const filterDate = parseDateString(filters.submissionDate);
        if (!isSameLocalDay(createdDate, filterDate)) return false;
      }

      if (filters.eta === "Today" && !isSameLocalDay(etaDate, today)) return false;
      if (filters.eta === "Tomorrow" && !isSameLocalDay(etaDate, tomorrow)) return false;

      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${j.jobNo} ${j.branch} ${status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, filters]);

  const resetFilters = () => {
    setFilters({ branch: "All", status: "All", eta: "All", submissionDate: "", query: "" });
  };

  /* ---------- sidebar data ---------- */
  const branchRows = [
    {
      key: "all",
      label: "All branches",
      count: jobs.length,
      active: filters.branch === "All",
      initial: "*",
      isAll: true,
      onClick: () => setFilters((prev) => ({ ...prev, branch: "All" })),
    },
    ...visibleBranches.map((b) => ({
      key: b,
      label: b,
      count: jobs.filter((j) => j.branch === b).length,
      active: filters.branch === b,
      initial: b[0],
      slug: branchSlug(b),
      onClick: () => setFilters((prev) => ({ ...prev, branch: b })),
    })),
  ];

  const visibleStatusKeys = Object.keys(STATUS_META).filter((s) => isAdmin || !["Repaired", "Unrepaired"].includes(s));

  const statusRows = [
    {
      key: "all",
      label: "All statuses",
      count: jobs.length,
      active: filters.status === "All",
      swatch: "var(--text-faint)",
      onClick: () => setFilters((prev) => ({ ...prev, status: "All" })),
    },
    ...visibleStatusKeys.map((s) => {
      const meta = STATUS_META[s];
      let count;
      if (s === "Repaired") {
        count = jobs.filter((j) => normalizeStatus(j.status) === "Closed" && j.isRepaired === true).length;
      } else if (s === "Unrepaired") {
        count = jobs.filter(
          (j) => (normalizeStatus(j.status) === "Closed" || normalizeStatus(j.status) === "Rejected") && j.isRepaired === false
        ).length;
      } else {
        count = jobs.filter((j) => j.status === s).length;
      }
      return {
        key: s,
        label: meta.label,
        count,
        active: filters.status === s,
        swatch: meta.swatch,
        onClick: () => setFilters((prev) => ({ ...prev, status: s })),
      };
    }),
  ];

  /* ---------- stats ---------- */
  const branchLabel = filters.branch === "All" ? "All branches" : filters.branch;
  const dateLabel = filters.submissionDate ? ` · ${filters.submissionDate}` : "";

  const baseCards = [
    { label: "Total job sheets", value: filteredJobs.length, accent: "var(--amber)", sub: branchLabel + dateLabel },
    { label: "Pending", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Pending").length, accent: "var(--amber)", sub: "Awaiting review" },
    { label: "Ready", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Ready").length, accent: "var(--blue)", sub: "Ready for pickup" },
    { label: "For Approval", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Approved Pending").length, accent: "#e7c76b", sub: "In diagnosis" },
    { label: "Approved", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Approved").length, accent: "var(--teal)", sub: "In repair" },
    { label: "Closed", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Closed").length, accent: "var(--slate)", sub: "Delivered" },
    { label: "Rejected", value: filteredJobs.filter((j) => normalizeStatus(j.status) === "Rejected").length, accent: "var(--coral)", sub: "Not proceeded" },
  ];

  const repairCards = isAdmin
    ? [
        {
          label: "Repaired",
          value: filteredJobs.filter((j) => (normalizeStatus(j.status) === "Closed" || normalizeStatus(j.status) === "Rejected") && j.isRepaired === true).length,
          accent: "var(--teal)",
          sub: "Repair completed",
        },
        {
          label: "Unrepaired",
          value: filteredJobs.filter((j) => (normalizeStatus(j.status) === "Closed" || normalizeStatus(j.status) === "Rejected") && j.isRepaired === false).length,
          accent: "var(--coral)",
          sub: "Repair pending / not fixed",
        },
      ]
    : [];

  const statCards = [...baseCards, ...repairCards];

  /* ---------- chips ---------- */
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dateCounts = {
    Today: jobs.filter((j) => isSameLocalDay(parseDateString(j.eta), today)).length,
    Tomorrow: jobs.filter((j) => isSameLocalDay(parseDateString(j.eta), tomorrow)).length,
  };

  /* ---------- table / pagination ---------- */
  const totalRows = filteredJobs.length;
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRows = filteredJobs.slice(startIndex, endIndex);

  const stampClass = (status) => "stamp stamp--" + STATUS_META[status].key;

  /* ---------- job CRUD ---------- */
  const openNewJobForm = () => {
    setEditingJob(null);
    setFormOpen(true);
  };
  const openEditJobForm = (job) => {
    setEditingJob(job);
    setFormOpen(true);
  };
  const closeJobForm = () => {
    setFormOpen(false);
    setEditingJob(null);
  };

  const handleFormSubmit = async (payload, id) => {
    try {
      if (id) {
        await updateJobAPI(id, payload);
        showToast("Job sheet updated.");
      } else {
        await createJobAPI(payload);
        showToast("Job sheet created.");
      }
      await reloadJobs();
      closeJobForm();
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Couldn't save this job sheet — check the fields and try again.", true);
    }
  };

  const handleDeleteDrawerJob = async () => {
    if (!drawerJob) return;
    if (!window.confirm("Are you sure you want to permanently delete this job sheet?")) return;
    try {
      await deleteJobAPI(drawerJob.id);
      showToast("Job sheet deleted.");
      setDrawerJob(null);
      await reloadJobs();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Couldn't delete this job sheet — try again.", true);
    }
  };

  // Escape key closes drawer + form
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setDrawerJob(null);
        closeJobForm();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const topbarSub =
    `${filteredJobs.length} of ${jobs.length} job sheets` +
    (filters.branch !== "All" ? ` · ${filters.branch}` : "") +
    (filters.status !== "All" ? ` · ${filters.status}` : "") +
    (filters.submissionDate ? ` · ${filters.submissionDate}` : filters.eta !== "All" ? ` · ${filters.eta}` : "");

  const visibleStatusChipKeys = Object.keys(STATUS_META).filter((s) => isAdmin || !["Repaired", "Unrepaired"].includes(s));

  return (
    <div className="app">
      <Sidebar
        activePage="dashboard"
        branchRows={branchRows}
        statusRows={statusRows}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" id="menuToggle" aria-label="Toggle menu" onClick={() => setMobileSidebarOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="topbar__title">
            <h1>Job Sheets Dashboard</h1>
            <p id="topbarSub">{topbarSub}</p>
          </div>

          <div className="topbar__search">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="searchInput"
              type="text"
              placeholder="Search job sheet no, customer, serial…"
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value.trim() }))}
            />
          </div>

          <div className="topbar__user" id="topbarUser">
            <span className="topbar__user-label">Signed in as</span>
            <strong id="currentUsername">{getCurrentUserName()}</strong>
          </div>

          <button className="btn btn--danger" id="logoutBtn" type="button" onClick={logoutUser}>
            Logout
          </button>

          <button className="theme-toggle" id="themeToggle" type="button" aria-label="Toggle light mode" onClick={toggleTheme}>
            <span className="theme-toggle__icon">{theme === "light" ? "🌙" : "☀️"}</span>
            <span className="theme-toggle__label">{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>

          <button className="btn btn--primary" id="newJobBtn" style={{ display: isViewer ? "none" : "inline-flex" }} onClick={openNewJobForm}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            New Job Sheet
          </button>
        </header>

        <div className="scroll-area">
          <section className={`stats${isAdmin ? " is-admin" : ""}`} id="statsRow">
            {statCards.map((c) => (
              <div className="stat-card" key={c.label} style={{ "--accent": c.accent }}>
                <div className="stat-card__label">{c.label}</div>
                <div className="stat-card__value">{c.value}</div>
                <div className="stat-card__sub">{c.sub}</div>
              </div>
            ))}
          </section>

          <section className="filterbar">
            <div className="filter-card filter-card--combined">
              <div className="filter-card__section">
                <div className="filter-card__title">All branches</div>
                <div className="chipgroup chipgroup--branches" id="branchChips">
                  {visibleBranches.map((b) => (
                    <button
                      key={b}
                      className={`chip${filters.branch === b ? " is-active" : ""} branch-${branchSlug(b)}`}
                      onClick={() => setFilters((prev) => ({ ...prev, branch: b }))}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card__section">
                <div className="filter-card__title">All statuses</div>
                <div className="chipgroup chipgroup--statuses" id="statusChips">
                  {visibleStatusChipKeys.map((s) => {
                    const meta = STATUS_META[s];
                    return (
                      <button
                        key={s}
                        className={`chip${filters.status === s ? " is-active" : ""}`}
                        onClick={() => setFilters((prev) => ({ ...prev, status: s }))}
                      >
                        <span className="chip__swatch" style={{ background: meta.swatch }}></span>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-card__section">
                <div className="filter-card__title">Submission date</div>
                <input
                  type="date"
                  className="filter-date-input"
                  id="submissionDateFilter"
                  value={filters.submissionDate}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      submissionDate: e.target.value,
                      eta: e.target.value ? "All" : prev.eta,
                    }))
                  }
                />
                <div className="chipgroup chipgroup--eta" id="etaChips">
                  {["Today", "Tomorrow"].map((label) => (
                    <button
                      key={label}
                      className={`chip${filters.eta === label && !filters.submissionDate ? " is-active" : ""}`}
                      onClick={() => setFilters((prev) => ({ ...prev, submissionDate: "", eta: label }))}
                    >
                      {label} ({dateCounts[label] || 0})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="link-btn filterbar__reset" id="resetFilters" onClick={resetFilters}>
              Reset filters
            </button>
          </section>

          <section className="table-wrap">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Submission date</th>
                  <th>Submit ETA</th>
                  <th>Branch</th>
                  <th>Job Sheet</th>
                  <th>Status</th>
                  <th>Approved Rejected ETA</th>
                  <th>Advance Paid</th>
                </tr>
              </thead>
              <tbody id="jobTableBody">
                {paginatedRows.map((j) => {
                  const status = normalizeStatus(j.status);
                  const bSlug = branchSlug(j.branch);
                  const normalizedAdvance = normalizeAdvancePaid(j.advancePaid);
                  const advanceClass = advanceClassFor(normalizedAdvance);
                  return (
                    <tr key={j.id} className={`branch-${bSlug}`} onClick={() => setDrawerJob(j)}>
                      <td className="cell-date">{formatDateDisplay(j.createdDate)}</td>
                      <td className="cell-eta">{formatDateDisplay(j.eta)}</td>
                      <td className={`cell-branch branch-${bSlug}`}>{j.branch}</td>
                      <td className={`cell-jobno branch-${bSlug}`}>{j.jobNo}</td>
                      <td>
                        <span className={stampClass(status)}>{STATUS_META[status]?.label || status}</span>
                      </td>
                      <td className="cell-eta">{j.approvedEta ? formatDateDisplay(j.approvedEta) : "—"}</td>
                      <td className={`cell-advance ${advanceClass}`}>{normalizedAdvance || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalRows === 0 && (
              <div className="empty-state" id="emptyState">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path
                    d="M4 7l1-3h14l1 3M4 7v12a1 1 0 001 1h14a1 1 0 001-1V7M4 7h16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>No job sheets match these filters.</p>
                <button className="link-btn" id="emptyReset" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            )}

            <div id="tablePagination">
              {totalRows > ITEMS_PER_PAGE && (
                <div className="pagination-controls">
                  <div className="pagination-info">
                    Showing {startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
                  </div>
                  <div className="pagination-buttons">
                    {currentPage > 0 && (
                      <button
                        className="btn btn--secondary"
                        onClick={() => {
                          setCurrentPage((p) => p - 1);
                          window.scrollTo(0, 0);
                        }}
                      >
                        ← Previous
                      </button>
                    )}
                    {endIndex < totalRows && (
                      <button
                        className="btn btn--primary"
                        onClick={() => {
                          setCurrentPage((p) => p + 1);
                          window.scrollTo(0, 0);
                        }}
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <JobDrawer
        job={drawerJob}
        onClose={() => setDrawerJob(null)}
        onEdit={(job) => {
          setDrawerJob(null);
          openEditJobForm(job);
        }}
        onDelete={handleDeleteDrawerJob}
      />

      <JobFormModal
        open={formOpen}
        job={editingJob}
        onClose={closeJobForm}
        onSubmit={handleFormSubmit}
        onValidationError={(msg) => showToast(msg, true)}
      />

      <Toast toast={toast} />
    </div>
  );
}
