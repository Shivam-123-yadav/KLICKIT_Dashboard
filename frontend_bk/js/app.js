/* ==========================================================================
   KLICKIT Job Sheet Dashboard — frontend logic (API-connected)
   ========================================================================== */

const API_BASE = "/api/generic";
// const API_BASE = "/api/apiview";

const BRANCHES = ["Andheri", "Thane", "Dadar", "Vashi"];

function branchSlug(name){
  return String(name).toLowerCase().replace(/\s+/g, '-');
}

const STATUS_META = {
  "Pending":            { key: "pending",           label: "Pending",           swatch: "var(--amber)" },
  "Approved Pending":   { key: "approved-pending",   label: "For Approval",      swatch: "#e7c76b" },
  "Approved":           { key: "approved",           label: "Approved",          swatch: "var(--teal)" },
  "Rejected":           { key: "rejected",           label: "Rejected",          swatch: "var(--coral)" },
  "Ready":              { key: "ready",             label: "Ready",             swatch: "var(--blue)" },
  "Closed":             { key: "closed",             label: "Closed",            swatch: "var(--slate)" },
  "Repaired":           { key: "repaired",          label: "Repaired",          swatch: "var(--teal)" },
  "Unrepaired":         { key: "unrepaired",        label: "Unrepaired",        swatch: "var(--coral)" },
};

/* ---------- state ---------- */
const ETA_FILTERS = ["All", "Today", "Tomorrow"];
const ITEMS_PER_PAGE = 20;

let currentJob = null;
let drawerJob = null;
let currentPage = 0;

let state = {
  branch: "All",
  status: "All",
  eta: "All",
  submissionDate: "",
  query: "",
};

let JOBS = [];

function getStoredTheme(){
  return localStorage.getItem("klickit-theme") || "dark";
}

function applyTheme(theme){
  document.body.setAttribute("data-theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    const label = toggle.querySelector(".theme-toggle__label");
    const icon = toggle.querySelector(".theme-toggle__icon");
    if (label) label.textContent = theme === "light" ? "Dark mode" : "Light mode";
    if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
  }
}

function toggleTheme(){
  const nextTheme = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
  localStorage.setItem("klickit-theme", nextTheme);
  applyTheme(nextTheme);
}

function getCurrentUserName(){
  return localStorage.getItem("username") || "User";
}

function getCurrentUserBranch(){
  return localStorage.getItem("branch") || "";
}

function getCurrentUserRole(){
  return localStorage.getItem("role") || "";
}

function isCurrentUserAdmin(){
  return getCurrentUserRole() === "admin";
}

function isCurrentUserViewer(){
  return getCurrentUserRole() === "viewer";
}

function getVisibleBranches(){
  const role = getCurrentUserRole();
  const branch = getCurrentUserBranch();

  if (role === "admin" || role === "viewer" || branch === "Andheri") {
    return BRANCHES;
  }

  if (!branch) {
    return [];
  }

  return BRANCHES.filter(b => b === branch);
}

function updateHeaderUser(){
  const usernameEl = document.getElementById("currentUsername");
  if (usernameEl) {
    usernameEl.textContent = getCurrentUserName();
  }
}

async function logoutUser(){
  const refreshToken = localStorage.getItem("refresh_token");

  try {
    if (refreshToken) {
      await fetch("/api/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    }
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("branch");
    window.location.replace("./login.html");
  }
}

/* ========== ROLE-BASED UI VISIBILITY ========== */
function updateUIBasedOnRole() {
    const role = getCurrentUserRole();
    const isViewer = role === "viewer";
    const isAdmin = role === "admin";
    
    const newJobBtn = document.getElementById("newJobBtn");
    if (newJobBtn) {
        newJobBtn.style.display = isViewer ? "none" : "inline-flex";
    }

    const statsRow = document.getElementById("statsRow");
    if (statsRow) {
        statsRow.classList.toggle("is-admin", isAdmin);
    }
    
    console.log(`UI Updated: Role = ${role}, Viewer = ${isViewer}`);
}

/* ========== REPAIR STATE FUNCTIONS ========== */
function getRepairRadioValue() {
    const radios = document.querySelectorAll('input[name="repairState"]');
    for (const radio of radios) {
        if (radio.checked) {
            return radio.value === "true";
        }
    }
    return null;
}

function setRepairRadioValue(value) {
    const trueRadio = document.getElementById("repairCheckboxTrue");
    const falseRadio = document.getElementById("repairCheckboxFalse");
    if (trueRadio) trueRadio.checked = value === true;
    if (falseRadio) falseRadio.checked = value === false;
}

function updateRepairCheckbox(status) {
    const repairContainer = document.getElementById("repairCheckboxContainer");
    
    if (!repairContainer) return;
    
    // 👇 UPDATED: Only show repair checkbox for Closed status, not for Rejected
    if (status === "Closed") {
        repairContainer.style.display = "flex";
    } else {
        repairContainer.style.display = "none";
    }
}

/* ---------- helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

/* ---------- API layer ---------- */
function showToast(message, isError = false){
  let toast = $("#apiToast");
  if (!toast) {
    toast = el("div", "api-toast");
    toast.id = "apiToast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function apiRequest(path, options = {}){
  const accessToken = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = JSON.stringify(body);
    } catch (_) { /* no json body */ }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function fetchJobs(){
  const data = await apiRequest("/jobsheets/?page_size=10000");
  return Array.isArray(data) ? data : data.results;
}

async function createJobAPI(payload){
  return apiRequest("/jobsheets/", { method: "POST", body: JSON.stringify(payload) });
}

async function updateJobAPI(id, payload){
  return apiRequest(`/jobsheets/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

async function deleteJobAPI(id){
  return apiRequest(`/jobsheets/${id}/`, { method: "DELETE" });
}

async function reloadJobs(){
  try {
    JOBS = await fetchJobs();
  } catch (err) {
    console.error("Failed to load job sheets:", err);
    showToast("Couldn't reach the backend — check the server is running.", true);
    JOBS = [];
  }
  renderAll();
}

/* ---------- date helpers ---------- */
function parseDateString(value){
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "&mdash;" || trimmed === "—" || !trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const normalized = trimmed.replace(/\s+/g, "-").replace(/\.+/g, "-");
  const parts = normalized.split("-");
  if (parts.length !== 3) return null;
  const [day, mon, year] = parts;
  const monthIndex = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(mon);
  if (monthIndex === -1) return null;
  const d = Number(day);
  const y = Number(year);
  if (!d || !y) return null;
  return new Date(y, monthIndex, d);
}

function isSameLocalDay(dateA, dateB){
  return dateA && dateB && dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

function formatDateInput(value){
  const date = parseDateString(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(value){
  const date = parseDateString(value);
  if (!date) return value || "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function normalizeAdvancePaid(value) {
  // 👇 FIX: Ensure only "Paid", "Unpaid", or "NA" are displayed
  if (value === 'Paid' || value === 'Paid ') return 'Paid';
  if (value === 'Unpaid' || value === 'Unpaid ') return 'Unpaid';
  if (value === 'NA' || value === 'NA ') return 'NA';
  // Convert numeric/boolean values from corrupted data
  if (value === '1' || value === 1 || value === true) return 'Paid';
  if (value === '0' || value === 0 || value === false) return 'Unpaid';
  // Default to Unpaid for any other value
  return value ? 'Unpaid' : null;
}

function normalizeStatus(value){
  if (!value) return "";
  return String(value).trim();
}

function repairStatusValue(job){
  if (normalizeStatus(job.status) === "Closed" && job.isRepaired === true) return "Repaired";
  if (normalizeStatus(job.status) === "Closed" && job.isRepaired === false) return "Unrepaired";
  if (normalizeStatus(job.status) === "Rejected" && job.isRepaired === false) return "Unrepaired";
  if (normalizeStatus(job.status) === "Rejected" && job.isRepaired === true) return "Repaired";
  return "";
}

function filteredJobs(){
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return JOBS.filter(j => {
    const status = normalizeStatus(j.status);
    const repairStatus = repairStatusValue(j);
    
    if (state.branch !== "All" && j.branch !== state.branch) return false;
    
    // 👇 UPDATED: Status filter with Repair/Unrepaired support
    if (state.status !== "All") {
      if (state.status === "Repaired" && repairStatus !== "Repaired") return false;
      if (state.status === "Unrepaired" && repairStatus !== "Unrepaired") return false;
      if (state.status !== "Repaired" && state.status !== "Unrepaired" && status !== state.status) return false;
    }

    const createdDate = parseDateString(j.createdDate);
    const etaDate = parseDateString(j.eta);

    if (state.submissionDate) {
      const filterDate = parseDateString(state.submissionDate);
      if (!isSameLocalDay(createdDate, filterDate)) return false;
    }

    if (state.eta === "Today" && !isSameLocalDay(etaDate, today)) return false;
    if (state.eta === "Tomorrow" && !isSameLocalDay(etaDate, tomorrow)) return false;

    if (state.query){
      const q = state.query.toLowerCase();
      const hay = `${j.jobNo} ${j.branch} ${status}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ---------- sidebar: branches ---------- */
function renderBranchList(){
  const wrap = $("#branchList");
  wrap.innerHTML = "";

  const visibleBranches = getVisibleBranches();
  const role = getCurrentUserRole();

  if (state.branch !== "All" && !visibleBranches.includes(state.branch)) {
    state.branch = role === "admin" ? "All" : visibleBranches[0] || "All";
  }

  const allRow = el("div", "branch-row" + (state.branch === "All" ? " is-active" : ""));
  allRow.classList.add('branch-all');
  allRow.innerHTML = `
    <span class="branch-row__left">
      <span class="branch-row__initial">*</span> All branches
    </span>
    <span class="branch-row__count">${JOBS.length}</span>`;
  allRow.onclick = () => { state.branch = "All"; renderAll(); };
  wrap.appendChild(allRow);

  visibleBranches.forEach(b => {
    const count = JOBS.filter(j => j.branch === b).length;
    const slug = branchSlug(b);
    const row = el("div", "branch-row branch-"+slug + (state.branch === b ? " is-active" : ""));
    row.innerHTML = `
      <span class="branch-row__left">
        <span class="branch-row__initial branch-badge branch-${slug}">${b[0]}</span> ${b}
      </span>
      <span class="branch-row__count">${count}</span>`;
    row.onclick = () => { state.branch = b; renderAll(); };
    wrap.appendChild(row);
  });
}

/* ---------- sidebar: statuses ---------- */
function renderStatusList(){
  const wrap = $("#statusList");
  wrap.innerHTML = "";

  const allRow = el("div", "status-row" + (state.status === "All" ? " is-active" : ""));
  allRow.innerHTML = `
    <span class="status-row__left"><span class="status-row__swatch" style="background:var(--text-faint)"></span> All statuses</span>
    <span class="status-row__count">${JOBS.length}</span>`;
  allRow.onclick = () => { state.status = "All"; renderAll(); };
  wrap.appendChild(allRow);

  // 👇 UPDATED: Sirf Admin ko Repair/Unrepaired dikhe
  const visibleStatusKeys = Object.keys(STATUS_META).filter(s => 
    isCurrentUserAdmin() || !["Repaired", "Unrepaired"].includes(s)
  );

  visibleStatusKeys.forEach(s => {
    const meta = STATUS_META[s];
    let count;
    if (s === "Repaired") {
      count = JOBS.filter(j => normalizeStatus(j.status) === "Closed" && j.isRepaired === true).length;
    } else if (s === "Unrepaired") {
      count = JOBS.filter(j => (normalizeStatus(j.status) === "Closed" || normalizeStatus(j.status) === "Rejected") && j.isRepaired === false).length;
    } else {
      count = JOBS.filter(j => j.status === s).length;
    }
    const row = el("div", "status-row" + (state.status === s ? " is-active" : ""));
    row.innerHTML = `
      <span class="status-row__left"><span class="status-row__swatch" style="background:${meta.swatch}"></span> ${meta.label}</span>
      <span class="status-row__count">${count}</span>`;
    row.onclick = () => { state.status = s; renderAll(); };
    wrap.appendChild(row);
  });
}

/* ---------- stat cards ---------- */
function renderStats(){
  const wrap = $("#statsRow");
  wrap.innerHTML = "";

  const filteredItems = filteredJobs();
  const branchLabel = state.branch === "All" ? "All branches" : state.branch;
  const dateLabel = state.submissionDate ? ` · ${state.submissionDate}` : "";

  const baseCards = [
    { label: "Total job sheets", value: filteredItems.length, accent: "var(--amber)", sub: branchLabel + dateLabel },
    { label: "Pending", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Pending").length, accent: "var(--amber)", sub: "Awaiting review" },
    { label: "Ready", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Ready").length, accent: "var(--blue)", sub: "Ready for pickup" },
    { label: "For Approval", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Approved Pending").length, accent: "#e7c76b", sub: "In diagnosis" },
    { label: "Approved", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Approved").length, accent: "var(--teal)", sub: "In repair" },
    { label: "Closed", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Closed").length, accent: "var(--slate)", sub: "Delivered" },
    { label: "Rejected", value: filteredItems.filter(j=>normalizeStatus(j.status)==="Rejected").length, accent: "var(--coral)", sub: "Not proceeded" },
  ];

  // 👇 NEW: Repair cards - sirf Admin ko dikhe
  const repairCards = isCurrentUserAdmin() ? [
    { label: "Repaired", value: filteredItems.filter(j => (normalizeStatus(j.status)==="Closed" || normalizeStatus(j.status)==="Rejected") && j.isRepaired === true).length, accent: "var(--teal)", sub: "Repair completed" },
    { label: "Unrepaired", value: filteredItems.filter(j => (normalizeStatus(j.status)==="Closed" || normalizeStatus(j.status)==="Rejected") && j.isRepaired === false).length, accent: "var(--coral)", sub: "Repair pending / not fixed" },
  ] : [];

  const cards = [...baseCards, ...repairCards];

  cards.forEach(c => {
    const card = el("div", "stat-card");
    card.style.setProperty("--accent", c.accent);
    card.innerHTML = `
      <div class="stat-card__label">${c.label}</div>
      <div class="stat-card__value">${c.value}</div>
      <div class="stat-card__sub">${c.sub}</div>`;
    wrap.appendChild(card);
  });
}

/* ---------- filter chips ---------- */
function renderChips(){
  const bWrap = $("#branchChips");
  bWrap.innerHTML = "";
  const visibleBranches = getVisibleBranches();
  visibleBranches.forEach(b => {
    const slug = branchSlug(b);
    const chip = el("button", "chip" + (state.branch === b ? " is-active" : "") + ' branch-'+slug, b);
    chip.onclick = () => { state.branch = b; renderAll(); };
    bWrap.appendChild(chip);
  });

  const sWrap = $("#statusChips");
  sWrap.innerHTML = "";
  
  // 👇 UPDATED: Sirf Admin ko Repair/Unrepaired dikhe
  const visibleStatusKeys = Object.keys(STATUS_META).filter(s => 
    isCurrentUserAdmin() || !["Repaired", "Unrepaired"].includes(s)
  );
  
  visibleStatusKeys.forEach(s => {
    const meta = STATUS_META[s];
    const chip = el("button", "chip" + (state.status === s ? " is-active" : ""));
    chip.innerHTML = `<span class="chip__swatch" style="background:${meta.swatch}"></span>${meta.label}`;
    chip.onclick = () => { state.status = s; renderAll(); };
    sWrap.appendChild(chip);
  });

  const tWrap = $("#etaChips");
  tWrap.innerHTML = "";
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateCounts = {
    Today: JOBS.filter(j => isSameLocalDay(parseDateString(j.eta), today)).length,
    Tomorrow: JOBS.filter(j => isSameLocalDay(parseDateString(j.eta), tomorrow)).length,
  };

  ["Today", "Tomorrow"].forEach(label => {
    const count = dateCounts[label] || 0;
    const chip = el("button", "chip" + (state.eta === label && !state.submissionDate ? " is-active" : ""), `${label} (${count})`);
    chip.onclick = () => {
      state.submissionDate = "";
      state.eta = label;
      const dateInput = $("#submissionDateFilter");
      if (dateInput) dateInput.value = "";
      renderAll();
    };
    tWrap.appendChild(chip);
  });
}

/* ---------- table ---------- */
function stampClass(status){
  return "stamp stamp--" + STATUS_META[status].key;
}

function renderTable(){
  const body = $("#jobTableBody");
  const empty = $("#emptyState");
  body.innerHTML = "";

  const rows = filteredJobs();
  const totalRows = rows.length;
  empty.hidden = totalRows !== 0;

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRows = rows.slice(startIndex, endIndex);

  paginatedRows.forEach(j => {
    const status = normalizeStatus(j.status);
    const branchSlugName = branchSlug(j.branch);
    // 👇 UPDATED: Use normalizeAdvancePaid to handle all states
    const normalizedAdvance = normalizeAdvancePaid(j.advancePaid);
    const advanceClass = normalizedAdvance === 'Paid' ? 'advance-paid' 
                       : normalizedAdvance === 'Unpaid' ? 'advance-unpaid' 
                       : 'advance-na';
    const tr = el("tr", `branch-${branchSlugName}`);
    tr.innerHTML = `
      <td class="cell-date">${formatDateDisplay(j.createdDate)}</td>
      <td class="cell-eta">${formatDateDisplay(j.eta)}</td>
      <td class="cell-branch branch-${branchSlugName}">${j.branch}</td>
      <td class="cell-jobno branch-${branchSlugName}">${j.jobNo}</td>
      <td><span class="${stampClass(status)}">${STATUS_META[status]?.label || status}</span></td>
      <td class="cell-eta">${j.approvedEta ? formatDateDisplay(j.approvedEta) : '—'}</td>
      <td class="cell-advance ${advanceClass}">${normalizedAdvance || '—'}</td>
    `;
    tr.onclick = () => openDrawer(j);
    body.appendChild(tr);
  });

  const paginationContainer = $("#tablePagination");
  if (paginationContainer) {
    paginationContainer.innerHTML = "";
    
    if (totalRows > ITEMS_PER_PAGE) {
      const paginationDiv = el("div", "pagination-controls");
      
      const showingTo = Math.min(endIndex, totalRows);
      const infoDiv = el("div", "pagination-info");
      infoDiv.textContent = `Showing ${startIndex + 1}–${showingTo} of ${totalRows}`;
      paginationDiv.appendChild(infoDiv);

      const buttonsDiv = el("div", "pagination-buttons");
      
      if (currentPage > 0) {
        const prevBtn = el("button", "btn btn--secondary");
        prevBtn.textContent = "← Previous";
        prevBtn.onclick = () => {
          currentPage -= 1;
          renderTable();
          window.scrollTo(0, 0);
        };
        buttonsDiv.appendChild(prevBtn);
      }

      if (endIndex < totalRows) {
        const nextBtn = el("button", "btn btn--primary");
        nextBtn.textContent = "Next →";
        nextBtn.onclick = () => {
          currentPage += 1;
          renderTable();
          window.scrollTo(0, 0);
        };
        buttonsDiv.appendChild(nextBtn);
      }

      paginationDiv.appendChild(buttonsDiv);
      paginationContainer.appendChild(paginationDiv);
    }
  }
}

/* ---------- drawer ---------- */
function openDrawer(j){
  drawerJob = j;
  $("#drawerJobNo").textContent = `JOB SHEET · ${j.jobNo}`;
  $("#drawerCustomer").textContent = `Branch · ${j.branch}`;

  // 👇 REPAIR STATUS LABEL - Only for Closed status
  let repairStatus = "—";
  if (j.status === "Closed") {
      repairStatus = j.isRepaired ? "✅ Repaired" : "❌ Unrepaired";
  }

  // 👇 ADVANCE PAID DISPLAY with normalization
  const normalizedAdvance = normalizeAdvancePaid(j.advancePaid);
  let advanceClass = normalizedAdvance === 'Paid' ? 'advance-paid' 
                   : normalizedAdvance === 'Unpaid' ? 'advance-unpaid' 
                   : 'advance-na';

  $("#drawerBody").innerHTML = `
    <div class="dgroup">
      <div class="dgroup__title">Job details</div>
      <div class="dgrid" style="margin-top:14px;">
        <div class="dfield"><div class="dfield__label">Submission date</div><div class="dfield__value mono">${formatDateDisplay(j.createdDate)}</div></div>
        <div class="dfield"><div class="dfield__label">Branch</div><div class="dfield__value">${j.branch}</div></div>
        <div class="dfield"><div class="dfield__label">Assigned by</div><div class="dfield__value">${j.assignedBy || "—"}</div></div>
        <div class="dfield"><div class="dfield__label">Status</div><div class="dfield__value">${normalizeStatus(j.status)}</div></div>
        <div class="dfield"><div class="dfield__label">Submit ETA</div><div class="dfield__value mono">${formatDateDisplay(j.eta)}</div></div>
        <div class="dfield"><div class="dfield__label">Approved Rejected ETA</div><div class="dfield__value mono">${j.approvedEta ? formatDateDisplay(j.approvedEta) : '—'}</div></div>
        <div class="dfield"><div class="dfield__label">Advance Paid</div><div class="dfield__value ${advanceClass}">${normalizedAdvance || '—'}</div></div>
        <div class="dfield"><div class="dfield__label">Repair Status</div><div class="dfield__value">${repairStatus}</div></div>
      </div>
    </div>
  `;

  const drawerEditButton = $("#drawerEdit");
  if (drawerEditButton) {
    const isViewer = getCurrentUserRole() === "viewer";
    drawerEditButton.style.display = isViewer ? "none" : "inline-flex";
  }

  const drawerDeleteButton = $("#drawerDelete");
  if (drawerDeleteButton) {
    const isAdmin = isCurrentUserAdmin();
    const isViewer = getCurrentUserRole() === "viewer";
    drawerDeleteButton.style.display = (isAdmin && !isViewer) ? "inline-flex" : "none";
  }

  $("#drawer").classList.add("is-open");
  $("#drawerBackdrop").classList.add("is-open");
}

function closeDrawer(){
  drawerJob = null;
  $("#drawer").classList.remove("is-open");
  $("#drawerBackdrop").classList.remove("is-open");
}

async function deleteDrawerJob(){
  if (!drawerJob) return;
  if (!window.confirm("Are you sure you want to permanently delete this job sheet?")) {
    return;
  }
  try {
    await deleteJobAPI(drawerJob.id);
    showToast("Job sheet deleted.");
    closeDrawer();
    await reloadJobs();
  } catch (err) {
    console.error("Delete failed:", err);
    showToast("Couldn't delete this job sheet — try again.", true);
  }
}

async function fetchEmployees(branch){
  const apiPath = "/auth/employees/" + (branch ? `?branch=${encodeURIComponent(branch)}` : "");
  const response = await fetch(`/api${apiPath}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to load employees");
  }
  return response.json();
}

async function populateAssignedByOptions(form, selectedValue = ""){
  const assignedBySelect = form.elements.namedItem("assignedBy");
  const branchSelect = form.elements.namedItem("branch");
  if (!assignedBySelect || !branchSelect) return;

  const branch = branchSelect.value;
  assignedBySelect.innerHTML = "<option value=''>Loading employees…</option>";
  assignedBySelect.disabled = true;

  try {
    const employees = await fetchEmployees(branch);
    assignedBySelect.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Select employee";
    assignedBySelect.appendChild(emptyOption);

    employees.forEach((employee) => {
      const option = document.createElement("option");
      option.value = employee.username;
      option.textContent = employee.fullName || employee.username;
      assignedBySelect.appendChild(option);
    });

    if (selectedValue && employees.some(e => e.username === selectedValue)) {
      assignedBySelect.value = selectedValue;
    } else if (employees.length === 1) {
      assignedBySelect.value = employees[0].username;
    }
  } catch (error) {
    console.error(error);
    assignedBySelect.innerHTML = "<option value=''>Failed to load employees</option>";
  } finally {
    assignedBySelect.disabled = false;
  }
}

function populateBranchOptions(form){
  const branchSelect = form.elements.namedItem("branch");
  const role = getCurrentUserRole();
  const branch = getCurrentUserBranch();
  const visibleBranches = getVisibleBranches();

  if (!branchSelect) return;

  const currentValue = branchSelect.value || "";
  branchSelect.innerHTML = "";

  let options;
  if (role === "admin") {
    options = BRANCHES;
  } else {
    options = visibleBranches;
  }

  options.forEach((optionBranch) => {
    const option = document.createElement("option");
    option.value = optionBranch;
    option.textContent = optionBranch;
    branchSelect.appendChild(option);
  });

  if (options.includes(currentValue)) {
    branchSelect.value = currentValue;
  } else if (role === "admin") {
    branchSelect.value = "Andheri";
  } else if (options.length) {
    branchSelect.value = options[0];
  }

  if (role !== "admin" && branch && visibleBranches.includes(branch)) {
    branchSelect.value = branch;
  }

  branchSelect.onchange = () => populateAssignedByOptions(form);
}

async function openJobForm(job = null){
  currentJob = job;
  const form = $("#newJobForm");
  form.reset();
  const today = new Date().toISOString().slice(0, 10);

  populateBranchOptions(form);

  const fieldsToToggle = ["submissionDate", "eta", "branch", "jobSheet", "advancePaid"];
  const setFieldsDisabled = (disabled) => {
    fieldsToToggle.forEach((name) => {
      const field = form.elements.namedItem(name);
      if (field) field.disabled = disabled;
    });
  };

  if (job) {
    $("#jobFormTitle").textContent = "Edit job sheet";
    form.querySelector("button[type='submit']").textContent = "Save changes";
    form.elements.namedItem("jobSheet").value = job.jobNo;
    form.elements.namedItem("submissionDate").value = formatDateInput(job.createdDate);
    form.elements.namedItem("branch").value = job.branch;
    form.elements.namedItem("status").value = job.status;
    form.elements.namedItem("eta").value = formatDateInput(job.eta);
    form.elements.namedItem("approvedEta").value = job.approvedEta ? formatDateInput(job.approvedEta) : "";
    
    // 👇 UPDATED: Normalize advance_paid before setting
    const normalizedAdvancePaidValue = normalizeAdvancePaid(job.advancePaid);
    form.elements.namedItem("advancePaid").value = normalizedAdvancePaidValue || "Unpaid";
    
    // 👇 SET REPAIR RADIO VALUE
    if (job.isRepaired !== undefined && job.isRepaired !== null) {
        setRepairRadioValue(job.isRepaired);
    }
    
    setFieldsDisabled(true);
    form.elements.namedItem("status").disabled = false;
    form.elements.namedItem("approvedEta").disabled = false;
    form.elements.namedItem("advancePaid").disabled = false;
    
    // 👇 UPDATE REPAIR CHECKBOX BASED ON STATUS
    updateRepairCheckbox(job.status);
    
    await populateAssignedByOptions(form, job.assignedBy || "");
  } else {
    $("#jobFormTitle").textContent = "Create job sheet";
    form.querySelector("button[type='submit']").textContent = "Save job sheet";
    form.elements.namedItem("submissionDate").value = today;
    form.elements.namedItem("eta").value = today;
    form.elements.namedItem("approvedEta").value = "";
    form.elements.namedItem("status").value = "Pending";
    form.elements.namedItem("advancePaid").value = "Unpaid";
    
    // 👇 HIDE REPAIR CHECKBOX IN CREATE MODE
    const repairContainer = document.getElementById("repairCheckboxContainer");
    if (repairContainer) repairContainer.style.display = "none";
    
    setFieldsDisabled(false);
    form.elements.namedItem("status").disabled = true;
    form.elements.namedItem("approvedEta").disabled = true;
    await populateAssignedByOptions(form);
  }

  $("#jobFormModal").classList.add("is-open");
  $("#formBackdrop").classList.add("is-open");
}

function openNewJobForm(){
  openJobForm(null);
}

function closeNewJobForm(){
  currentJob = null;
  $("#jobFormModal").classList.remove("is-open");
  $("#formBackdrop").classList.remove("is-open");
}

/* ---------- render orchestration ---------- */
function renderAll(){
  currentPage = 0;
  const statsRow = $("#statsRow");
  if (statsRow) {
    statsRow.classList.toggle("is-admin", isCurrentUserAdmin());
  }
  renderBranchList();
  renderStatusList();
  renderStats();
  renderChips();
  renderTable();
  $("#topbarSub").textContent =
    `${filteredJobs().length} of ${JOBS.length} job sheets` +
    (state.branch !== "All" ? ` · ${state.branch}` : "") +
    (state.status !== "All" ? ` · ${state.status}` : "") +
    (state.submissionDate ? ` · ${state.submissionDate}` : state.eta !== "All" ? ` · ${state.eta}` : "");
}

/* ---------- wiring ---------- */
$("#searchInput").addEventListener("input", (e) => {
  state.query = e.target.value.trim();
  renderAll();
});

$("#resetFilters").addEventListener("click", () => {
  state = { branch: "All", status: "All", eta: "All", query: "" };
  $("#searchInput").value = "";
  renderAll();
});
$("#emptyReset").addEventListener("click", () => $("#resetFilters").click());

const allBranchesButton = $("#allBranchesButton");
if (allBranchesButton) {
  allBranchesButton.addEventListener("click", () => {
    state.branch = "All";
    renderAll();
  });
}
const allStatusesButton = $("#allStatusesButton");
if (allStatusesButton) {
  allStatusesButton.addEventListener("click", () => {
    state.status = "All";
    renderAll();
  });
}
const allEtaButton = $("#allEtaButton");
if (allEtaButton) {
  allEtaButton.addEventListener("click", () => {
    state.eta = "All";
    state.submissionDate = "";
    const dateInput = $("#submissionDateFilter");
    if (dateInput) dateInput.value = "";
    renderAll();
  });
}

const submissionDateFilter = $("#submissionDateFilter");
if (submissionDateFilter) {
  submissionDateFilter.addEventListener("change", (e) => {
    state.submissionDate = e.target.value;
    if (state.submissionDate) {
      state.eta = "All";
    }
    renderAll();
  });
}

$("#drawerClose").addEventListener("click", closeDrawer);
$("#drawerBackdrop").addEventListener("click", closeDrawer);
$("#drawerEdit").addEventListener("click", () => { if (drawerJob) openJobForm(drawerJob); });
$("#drawerDelete").addEventListener("click", deleteDrawerJob);

/* ---------- sidebar navigation ---------- */
function closeSidebar(){
  $("#sidebar").classList.remove("is-open");
  const backdrop = $("#sidebarBackdrop");
  if (backdrop) backdrop.classList.remove("is-open");
}

function openSidebar(){
  $("#sidebar").classList.add("is-open");
  const backdrop = $("#sidebarBackdrop");
  if (backdrop) backdrop.classList.add("is-open");
}

$("#menuToggle").addEventListener("click", () => {
  if ($("#sidebar").classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

const sidebarBackdrop = $("#sidebarBackdrop");
if (sidebarBackdrop) {
  sidebarBackdrop.addEventListener("click", closeSidebar);
}

const brand = document.querySelector(".brand");
if (brand) {
  brand.addEventListener("click", closeSidebar);
}

document.addEventListener("click", (e) => {
  const navItem = e.target.closest(".nav__item");
  const branchRow = e.target.closest(".branch-row");
  const statusRow = e.target.closest(".status-row");
  
  if (navItem || branchRow || statusRow) {
    closeSidebar();
  }
});

$("#newJobBtn").addEventListener("click", openNewJobForm);
$("#formClose").addEventListener("click", closeNewJobForm);
$("#cancelJobForm").addEventListener("click", closeNewJobForm);
$("#formBackdrop").addEventListener("click", closeNewJobForm);

// 👇 STATUS CHANGE LISTENER FOR REPAIR CHECKBOX
document.addEventListener("DOMContentLoaded", function() {
    const statusSelect = document.querySelector("#newJobForm select[name='status']");
    if (statusSelect) {
        statusSelect.addEventListener("change", function() {
            updateRepairCheckbox(this.value);
        });
    }
});

$("#newJobForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const submitBtn = form.querySelector("button[type='submit']");

  const getValue = (name) => {
    const field = form.elements.namedItem(name);
    return field ? field.value : "";
  };

  const approvedEtaValue = getValue("approvedEta").trim();
  const status = getValue("status");
  const advancePaid = getValue("advancePaid");
  const isRepaired = getRepairRadioValue();

  // 👇 UPDATED: Only require repair status for Closed, not for Rejected
  if (status === "Closed" && isRepaired === null) {
      showToast("Select Repaired or Unrepaired before saving Closed jobs.", true);
      return;
  }

  const payload = {
    jobNo: getValue("jobSheet").trim(),
    createdDate: getValue("submissionDate"),
    branch: getValue("branch"),
    assignedBy: getValue("assignedBy").trim() || "",
    status: status,
    eta: getValue("eta"),
    approvedEta: approvedEtaValue ? approvedEtaValue : null,
    advancePaid: advancePaid, // 👈 Send as string: "Paid", "Unpaid", or "NA"
    isRepaired: status === "Closed" ? isRepaired : null,
  };

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Saving…";

  try {
    if (currentJob) {
      await updateJobAPI(currentJob.id, payload);
      showToast("Job sheet updated.");
    } else {
      await createJobAPI(payload);
      showToast("Job sheet created.");
    }
    await reloadJobs();
    closeNewJobForm();
    form.reset();
  } catch (err) {
    console.error("Save failed:", err);
    showToast("Couldn't save this job sheet — check the fields and try again.", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDrawer();
    closeNewJobForm();
  }
});

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

/* ---------- boot ---------- */
const accessToken = localStorage.getItem("access_token");
const isAuthenticated = Boolean(accessToken);

if (!isAuthenticated) {
  window.location.replace("./login.html");
} else {
  applyTheme(getStoredTheme());
  updateHeaderUser();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  updateUIBasedOnRole();
  reloadJobs();
}