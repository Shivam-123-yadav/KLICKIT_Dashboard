/* ==========================================================================
   KLICKIT Analytics — self-contained page script.
   Mirrors js/app.js's auth, theme, and role logic (this project doesn't
   have a shared api.js yet, so each page keeps its own copy — same pattern
   app.js/auth.js already follow). Fetches job sheets from the same
   /api/generic/jobsheets/ endpoint and renders them as charts.
   ========================================================================== */

const API_BASE = "/api/generic";

const BRANCHES = ["Andheri", "Thane", "Dadar", "Vashi"];

const STATUS_META = {
  "Pending":          { label: "Pending",       swatch: "var(--amber)" },
  "Ready":            { label: "Ready",         swatch: "var(--branch-andheri)" },
  "Approved Pending": { label: "For Approval",   swatch: "#e7c76b" },
  "Approved":         { label: "Approved",       swatch: "var(--teal)" },
  "Closed":           { label: "Closed",         swatch: "var(--slate)" },
  "Rejected":         { label: "Rejected",       swatch: "var(--coral)" },
};
// Hex fallbacks for the SVG donut, which can't resolve CSS custom properties
// through stroke-dasharray math the way the browser resolves them for paint.
const STATUS_HEX = {
  "Pending": "#f0a83c",
  "Ready": "#6c9ef7",
  "Approved Pending": "#e7c76b",
  "Approved": "#3fd6b6",
  "Closed": "#8891a0",
  "Rejected": "#ef6a63",
};

const RANGE_OPTIONS = [7, 14, 30, 90];

let JOBS = [];
let analyticsState = { range: 30 };

/* ---------- theme (same as app.js) ---------- */
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

/* ---------- auth / role (same as app.js) ---------- */
function getCurrentUserName(){ return localStorage.getItem("username") || "User"; }
function getCurrentUserBranch(){ return localStorage.getItem("branch") || ""; }
function getCurrentUserRole(){ return localStorage.getItem("role") || ""; }

function getVisibleBranches(){
  const role = getCurrentUserRole();
  const branch = getCurrentUserBranch();
  if (role === "admin" || role === "viewer" || branch === "Andheri") return BRANCHES;
  if (!branch) return [];
  return BRANCHES.filter(b => b === branch);
}

function updateHeaderUser(){
  const usernameEl = document.getElementById("currentUsername");
  if (usernameEl) usernameEl.textContent = getCurrentUserName();
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

/* ---------- helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

function parseDateString(value){
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}
function isSameLocalDay(a, b){
  return a && b && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysBetween(a, b){
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((b - a) / MS);
}

/* ---------- API (same pattern as app.js: Bearer token, same base) ---------- */
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
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = JSON.stringify(await res.json()); } catch (_) {}
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function fetchJobs(){
  const data = await apiRequest("/jobsheets/?page_size=10000");
  return Array.isArray(data) ? data : data.results;
}

/* ---------- boot ---------- */
async function boot(){
  try {
    JOBS = await fetchJobs();
    const visible = getVisibleBranches();
    JOBS = JOBS.filter(j => visible.includes(j.branch));
  } catch (err) {
    console.error("Failed to load job sheets:", err);
    showToast("Couldn't reach the backend — check the server is running.", true);
    JOBS = [];
  }
  renderRangeChips();
  renderSidebarLists();
  renderKPIs();
  renderTrace();
  renderDonut();
  renderBranchBars();
  renderEtaOutlook();
  renderRepairOutcome();
}

/* ---------- sidebar (read-only summary, mirrors dashboard styling) ---------- */
function renderSidebarLists(){
  const visible = getVisibleBranches();

  const bWrap = $("#branchList");
  bWrap.innerHTML = `
    <div class="branch-row">
      <span class="branch-row__left"><span class="branch-row__initial">*</span> All branches</span>
      <span class="branch-row__count">${JOBS.length}</span>
    </div>`;
  visible.forEach(b => {
    const count = JOBS.filter(j => j.branch === b).length;
    bWrap.insertAdjacentHTML("beforeend", `
      <div class="branch-row">
        <span class="branch-row__left"><span class="branch-row__initial">${b[0]}</span> ${b}</span>
        <span class="branch-row__count">${count}</span>
      </div>`);
  });

  const sWrap = $("#statusList");
  sWrap.innerHTML = `
    <div class="status-row">
      <span class="status-row__left"><span class="status-row__swatch" style="background:var(--text-faint)"></span> All statuses</span>
      <span class="status-row__count">${JOBS.length}</span>
    </div>`;
  Object.keys(STATUS_META).forEach(s => {
    const meta = STATUS_META[s];
    const count = JOBS.filter(j => j.status === s).length;
    sWrap.insertAdjacentHTML("beforeend", `
      <div class="status-row">
        <span class="status-row__left"><span class="status-row__swatch" style="background:${meta.swatch}"></span> ${meta.label}</span>
        <span class="status-row__count">${count}</span>
      </div>`);
  });
}

/* ---------- range chips ---------- */
function renderRangeChips(){
  const wrap = $("#rangeChips");
  wrap.innerHTML = "";
  RANGE_OPTIONS.forEach(days => {
    const chip = el("button", "chip" + (analyticsState.range === days ? " is-active" : ""), `${days}D`);
    chip.onclick = () => { analyticsState.range = days; renderRangeChips(); renderTrace(); };
    wrap.appendChild(chip);
  });
}

/* ---------- KPI strip ---------- */
function renderKPIs(){
  const wrap = $("#kpiStrip");
  if (!JOBS.length) {
    wrap.innerHTML = `<div class="analytics-empty" style="grid-column:1/-1;"><p>No job sheets in scope yet.</p></div>`;
    return;
  }

  const open = JOBS.filter(j => ["Pending", "Ready", "Approved Pending", "Approved"].includes(j.status)).length;
  const closed = JOBS.filter(j => j.status === "Closed").length;
  const rejected = JOBS.filter(j => j.status === "Rejected").length;

  const cycleDurations = JOBS
    .map(j => {
      const created = parseDateString(j.createdDate);
      const eta = parseDateString(j.eta);
      if (!created || !eta) return null;
      const diff = daysBetween(created, eta);
      return diff >= 0 ? diff : null;
    })
    .filter(v => v !== null);
  const avgCycle = cycleDurations.length
    ? (cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length)
    : 0;

  const cards = [
    { label: "Total job sheets", value: JOBS.length, accent: "var(--text-faint)" },
    { label: "Open", value: open, accent: "var(--amber)" },
    { label: "Closed", value: closed, accent: "var(--teal)" },
    { label: "Rejected", value: rejected, accent: "var(--coral)" },
    { label: "Avg. cycle time", value: avgCycle.toFixed(1), suffix: "days", accent: "var(--slate)" },
  ];

  wrap.innerHTML = "";
  cards.forEach(c => {
    const card = el("div", "kpi-card");
    card.style.setProperty("--accent", c.accent);
    card.innerHTML = `
      <div class="kpi-card__label">${c.label}</div>
      <div class="kpi-card__value">${c.value}${c.suffix ? `<small>${c.suffix}</small>` : ""}</div>`;
    wrap.appendChild(card);
  });
}

/* ---------- diagnostic trace (signature line chart) ---------- */
function renderTrace(){
  const scope = $("#traceScope");
  const range = analyticsState.range;

  $("#traceTitle").textContent = `Job sheets logged · last ${range} days`;
  $("#traceSnapshot").textContent = `Snapshot as of ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  if (!JOBS.length) {
    scope.innerHTML = `<div class="analytics-empty"><p>No job sheets yet — create one from the dashboard to see the intake trend here.</p></div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const counts = days.map(d => JOBS.filter(j => isSameLocalDay(parseDateString(j.createdDate), d)).length);

  const width = 900, height = 220;
  const padL = 34, padR = 10, padT = 16, padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const maxVal = Math.max(1, Math.ceil(Math.max(...counts) * 1.25));
  const n = days.length;

  const xFor = (i) => n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;
  const yFor = (v) => padT + innerH - (v / maxVal) * innerH;
  const baseline = padT + innerH;

  const points = counts.map((v, i) => ({ x: xFor(i), y: yFor(v), v, date: days[i] }));
  const linePath = "M " + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baseline} L ${points[0].x.toFixed(1)},${baseline} Z`;

  const gridFractions = [1, 0.5, 0];
  const gridLines = gridFractions.map(f => {
    const y = padT + innerH * (1 - f);
    const value = Math.round(maxVal * f);
    return `
      <line class="trace-grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}"></line>
      <text class="trace-axis-label" x="${padL - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${value}</text>`;
  }).join("");

  const labelStep = Math.max(1, Math.ceil(n / 7));
  const xLabels = points.map((p, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return "";
    const label = p.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `<text class="trace-axis-label" x="${p.x.toFixed(1)}" y="${height - 6}" text-anchor="middle">${label}</text>`;
  }).join("");

  const dots = points.map((p, i) => {
    if (i === n - 1 || p.v === 0) return "";
    return `<circle class="trace-point" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.6"></circle>`;
  }).join("");

  const last = points[n - 1];

  scope.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="traceAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--amber)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path class="trace-area" d="${areaPath}"></path>
      <path class="trace-line-glow" d="${linePath}"></path>
      <path class="trace-line" d="${linePath}"></path>
      ${dots}
      <circle class="trace-point--last-ring" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4"></circle>
      <circle class="trace-point--last" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.4"></circle>
      ${xLabels}
    </svg>
  `;
}

/* ---------- status donut ---------- */
function renderDonut(){
  const svgWrap = $("#donutWrap");
  const legendWrap = $("#donutLegend");

  const r = 70, cx = 84, cy = 84, strokeWidth = 22;
  const circumference = 2 * Math.PI * r;

  const statuses = Object.keys(STATUS_META);
  const counts = statuses.map(s => JOBS.filter(j => j.status === s).length);
  const total = counts.reduce((a, b) => a + b, 0);

  let segmentsSVG = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${strokeWidth}"></circle>`;

  if (total > 0) {
    let offsetAccum = 0;
    statuses.forEach((s, i) => {
      const count = counts[i];
      if (count === 0) return;
      const segLen = (count / total) * circumference;
      const gap = total > count ? 2 : 0;
      segmentsSVG += `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="${STATUS_HEX[s]}" stroke-width="${strokeWidth}"
          stroke-dasharray="${Math.max(segLen - gap, 0)} ${circumference}"
          stroke-dashoffset="${-offsetAccum}"
          stroke-linecap="butt"></circle>`;
      offsetAccum += segLen;
    });
  }

  svgWrap.innerHTML = `
    <svg viewBox="0 0 168 168">${segmentsSVG}</svg>
    <div class="donut-center">
      <div class="donut-center__value">${total}</div>
      <div class="donut-center__label">Total</div>
    </div>`;

  legendWrap.innerHTML = statuses.map((s, i) => `
    <div class="donut-legend__row">
      <span class="donut-legend__left">
        <span class="donut-legend__swatch" style="background:${STATUS_META[s].swatch}"></span>
        ${STATUS_META[s].label}
      </span>
      <span class="donut-legend__count">${counts[i]}</span>
    </div>`).join("");
}

/* ---------- branch gauges (role-scoped) ---------- */
function renderBranchBars(){
  const wrap = $("#branchBars");
  const visible = getVisibleBranches();

  if (!visible.length) {
    wrap.innerHTML = `<div class="analytics-empty"><p>No branch assigned to this account.</p></div>`;
    return;
  }

  const counts = visible.map(b => JOBS.filter(j => j.branch === b).length);
  const maxCount = Math.max(1, ...counts);

  wrap.innerHTML = visible.map((b, i) => {
    const count = counts[i];
    const pct = Math.round((count / maxCount) * 100);
    return `
      <div class="branch-bar-row">
        <div class="branch-bar-row__head">
          <span class="branch-bar-row__name">
            <span class="branch-bar-row__initial">${b[0]}</span> ${b}
          </span>
          <span class="branch-bar-row__count">${count}</span>
        </div>
        <div class="branch-bar-track">
          <div class="branch-bar-fill" style="width:${count === 0 ? 0 : Math.max(pct, 4)}%"></div>
        </div>
      </div>`;
  }).join("");
}

/* ---------- ETA outlook ---------- */
function renderEtaOutlook(){
  const wrap = $("#etaStrip");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

  const openJobs = JOBS.filter(j => !["Closed", "Rejected"].includes(j.status));

  const overdue = openJobs.filter(j => {
    const eta = parseDateString(j.eta);
    return eta && eta < today;
  }).length;
  const dueToday = openJobs.filter(j => isSameLocalDay(parseDateString(j.eta), today)).length;
  const dueTomorrow = openJobs.filter(j => isSameLocalDay(parseDateString(j.eta), tomorrow)).length;
  const next7 = openJobs.filter(j => {
    const eta = parseDateString(j.eta);
    return eta && eta > tomorrow && eta <= weekEnd;
  }).length;

  const cards = [
    { label: "Overdue", value: overdue, cls: "eta-card--overdue" },
    { label: "Due today", value: dueToday, cls: "eta-card--today" },
    { label: "Due tomorrow", value: dueTomorrow, cls: "" },
    { label: "Next 7 days", value: next7, cls: "" },
  ];

  wrap.innerHTML = cards.map(c => `
    <div class="eta-card ${c.cls}">
      <div class="eta-card__label">${c.label}</div>
      <div class="eta-card__value">${c.value}</div>
    </div>`).join("");
}

/* ---------- repair outcome (Closed jobs only — uses isRepaired) ---------- */
function renderRepairOutcome(){
  const wrap = $("#repairStrip");
  if (!wrap) return;

  const closedJobs = JOBS.filter(j => j.status === "Closed");
  const repaired = closedJobs.filter(j => j.isRepaired === true).length;
  const unrepaired = closedJobs.filter(j => j.isRepaired === false).length;
  const total = closedJobs.length;
  const repairedPct = total ? Math.round((repaired / total) * 100) : 0;

  if (!total) {
    wrap.innerHTML = `<div class="analytics-empty"><p>No closed jobs in scope yet.</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="repair-bar-track">
      <div class="repair-bar-fill" style="width:${repairedPct}%"></div>
    </div>
    <div class="repair-legend">
      <span><span class="repair-dot repair-dot--ok"></span>Repaired · ${repaired}</span>
      <span><span class="repair-dot repair-dot--bad"></span>Unrepaired · ${unrepaired}</span>
      <span class="repair-legend__pct">${repairedPct}% repaired</span>
    </div>`;
}

/* ---------- wiring ---------- */
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
const menuToggleBtn = $("#menuToggle");
if (menuToggleBtn) {
  menuToggleBtn.addEventListener("click", () => {
    $("#sidebar").classList.contains("is-open") ? closeSidebar() : openSidebar();
  });
}
const sidebarBackdropEl = $("#sidebarBackdrop");
if (sidebarBackdropEl) sidebarBackdropEl.addEventListener("click", closeSidebar);

const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

/* ---------- boot (auth-gated, same as app.js) ---------- */
const accessToken = localStorage.getItem("access_token");
if (!accessToken) {
  window.location.replace("./login.html");
} else {
  applyTheme(getStoredTheme());
  updateHeaderUser();
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
  boot();
}