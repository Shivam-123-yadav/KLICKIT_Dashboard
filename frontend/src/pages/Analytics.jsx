import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Toast, { useToast } from "../components/Toast";
import { ANALYTICS_STATUS_META, STATUS_HEX, RANGE_OPTIONS } from "../utils/constants";
import { parseDateString, isSameLocalDay, daysBetween } from "../utils/dates";
import { fetchJobs } from "../utils/api";
import {
  getCurrentUserName,
  getCurrentUserRole,
  getVisibleBranches,
  isAuthenticated,
  isCurrentUserAdmin,
  logoutUser,
} from "../utils/auth";
import { useTheme } from "../utils/useTheme";
import "../css/analytics.css";

export default function Analytics() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast, showToast } = useToast();

  const [jobs, setJobs] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [range, setRange] = useState(30);

  const visibleBranches = getVisibleBranches();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isCurrentUserAdmin()) {
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated() || !isCurrentUserAdmin()) return;
    (async () => {
      try {
        const data = await fetchJobs();
        const visible = getVisibleBranches();
        setJobs(data.filter((j) => visible.includes(j.branch)));
      } catch (err) {
        console.error("Failed to load job sheets:", err);
        showToast("Couldn't reach the backend — check the server is running.", true);
        setJobs([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- sidebar (read-only summary) ---------- */
  const branchRows = [
    { key: "all", label: "All branches", count: jobs.length, initial: "*", isAll: true },
    ...visibleBranches.map((b) => ({
      key: b,
      label: b,
      count: jobs.filter((j) => j.branch === b).length,
      initial: b[0],
    })),
  ];
  const statusRows = [
    { key: "all", label: "All statuses", count: jobs.length, swatch: "var(--text-faint)" },
    ...Object.keys(ANALYTICS_STATUS_META).map((s) => ({
      key: s,
      label: ANALYTICS_STATUS_META[s].label,
      count: jobs.filter((j) => j.status === s).length,
      swatch: ANALYTICS_STATUS_META[s].swatch,
    })),
  ];

  /* ---------- KPI strip ---------- */
  const kpis = useMemo(() => {
    if (!jobs.length) return null;
    const open = jobs.filter((j) => ["Pending", "Ready", "Approved Pending", "Approved"].includes(j.status)).length;
    const closed = jobs.filter((j) => j.status === "Closed").length;
    const rejected = jobs.filter((j) => j.status === "Rejected").length;

    const cycleDurations = jobs
      .map((j) => {
        const created = parseDateString(j.createdDate);
        const eta = parseDateString(j.eta);
        if (!created || !eta) return null;
        const diff = daysBetween(created, eta);
        return diff >= 0 ? diff : null;
      })
      .filter((v) => v !== null);
    const avgCycle = cycleDurations.length ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length : 0;

    return [
      { label: "Total job sheets", value: jobs.length, accent: "var(--text-faint)" },
      { label: "Open", value: open, accent: "var(--amber)" },
      { label: "Closed", value: closed, accent: "var(--teal)" },
      { label: "Rejected", value: rejected, accent: "var(--coral)" },
      { label: "Avg. cycle time", value: avgCycle.toFixed(1), suffix: "days", accent: "var(--slate)" },
    ];
  }, [jobs]);

  /* ---------- diagnostic trace (line chart) ---------- */
  const trace = useMemo(() => {
    if (!jobs.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const counts = days.map((d) => jobs.filter((j) => isSameLocalDay(parseDateString(j.createdDate), d)).length);

    const width = 900,
      height = 220;
    const padL = 34,
      padR = 10,
      padT = 16,
      padB = 26;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxVal = Math.max(1, Math.ceil(Math.max(...counts) * 1.25));
    const n = days.length;

    const xFor = (i) => (n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
    const yFor = (v) => padT + innerH - (v / maxVal) * innerH;
    const baseline = padT + innerH;

    const points = counts.map((v, i) => ({ x: xFor(i), y: yFor(v), v, date: days[i] }));
    const linePath = "M " + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baseline} L ${points[0].x.toFixed(1)},${baseline} Z`;

    const gridFractions = [1, 0.5, 0];
    const gridLines = gridFractions.map((f) => {
      const y = padT + innerH * (1 - f);
      const value = Math.round(maxVal * f);
      return { y, value };
    });

    const labelStep = Math.max(1, Math.ceil(n / 7));
    const xLabels = points
      .map((p, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null;
        return { x: p.x, label: p.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
      })
      .filter(Boolean);

    const dots = points.filter((p, i) => i !== n - 1 && p.v !== 0);
    const last = points[n - 1];

    return { width, height, padL, padR, linePath, areaPath, gridLines, xLabels, dots, last };
  }, [jobs, range]);

  /* ---------- status donut ---------- */
  const donut = useMemo(() => {
    const r = 70,
      cx = 84,
      cy = 84,
      strokeWidth = 22;
    const circumference = 2 * Math.PI * r;
    const statuses = Object.keys(ANALYTICS_STATUS_META);
    const counts = statuses.map((s) => jobs.filter((j) => j.status === s).length);
    const total = counts.reduce((a, b) => a + b, 0);

    const segments = [];
    if (total > 0) {
      let offsetAccum = 0;
      statuses.forEach((s, i) => {
        const count = counts[i];
        if (count === 0) return;
        const segLen = (count / total) * circumference;
        const gap = total > count ? 2 : 0;
        segments.push({
          key: s,
          color: STATUS_HEX[s],
          dasharray: `${Math.max(segLen - gap, 0)} ${circumference}`,
          dashoffset: -offsetAccum,
        });
        offsetAccum += segLen;
      });
    }

    return { r, cx, cy, strokeWidth, segments, total, statuses, counts };
  }, [jobs]);

  /* ---------- branch gauges ---------- */
  const branchBarData = useMemo(() => {
    if (!visibleBranches.length) return [];
    const counts = visibleBranches.map((b) => jobs.filter((j) => j.branch === b).length);
    const maxCount = Math.max(1, ...counts);
    return visibleBranches.map((b, i) => {
      const count = counts[i];
      const pct = Math.round((count / maxCount) * 100);
      return { branch: b, count, width: count === 0 ? 0 : Math.max(pct, 4) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  /* ---------- ETA outlook ---------- */
  const etaCards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const openJobs = jobs.filter((j) => !["Closed", "Rejected"].includes(j.status));

    const overdue = openJobs.filter((j) => {
      const eta = parseDateString(j.eta);
      return eta && eta < today;
    }).length;
    const dueToday = openJobs.filter((j) => isSameLocalDay(parseDateString(j.eta), today)).length;
    const dueTomorrow = openJobs.filter((j) => isSameLocalDay(parseDateString(j.eta), tomorrow)).length;
    const next7 = openJobs.filter((j) => {
      const eta = parseDateString(j.eta);
      return eta && eta > tomorrow && eta <= weekEnd;
    }).length;

    return [
      { label: "Overdue", value: overdue, cls: "eta-card--overdue" },
      { label: "Due today", value: dueToday, cls: "eta-card--today" },
      { label: "Due tomorrow", value: dueTomorrow, cls: "" },
      { label: "Next 7 days", value: next7, cls: "" },
    ];
  }, [jobs]);

  /* ---------- repair outcome ---------- */
  const repairOutcome = useMemo(() => {
    const closedJobs = jobs.filter((j) => j.status === "Closed");
    const repaired = closedJobs.filter((j) => j.isRepaired === true).length;
    const unrepaired = closedJobs.filter((j) => j.isRepaired === false).length;
    const total = closedJobs.length;
    const repairedPct = total ? Math.round((repaired / total) * 100) : 0;
    return { total, repaired, unrepaired, repairedPct };
  }, [jobs]);

  const snapshotDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="app">
      <Sidebar
        activePage="analytics"
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
            <h1>Analytics</h1>
            <p id="topbarSub">Job sheet volume &amp; queue health</p>
          </div>

          <div className="filterbar__spacer"></div>
          <div className="chipgroup" id="rangeChips">
            {RANGE_OPTIONS.map((days) => (
              <button key={days} className={`chip${range === days ? " is-active" : ""}`} onClick={() => setRange(days)}>
                {days}D
              </button>
            ))}
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
        </header>

        <div className="scroll-area">
          <section className="kpi-strip" id="kpiStrip">
            {kpis === null ? (
              <div className="analytics-empty" style={{ gridColumn: "1/-1" }}>
                <p>No job sheets in scope yet.</p>
              </div>
            ) : (
              kpis.map((c) => (
                <div className="kpi-card" key={c.label} style={{ "--accent": c.accent }}>
                  <div className="kpi-card__label">{c.label}</div>
                  <div className="kpi-card__value">
                    {c.value}
                    {c.suffix && <small>{c.suffix}</small>}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="trace-card">
            <div className="trace-card__head">
              <div>
                <p className="trace-card__eyebrow">Intake trace</p>
                <h2 id="traceTitle">Job sheets logged &middot; last {range} days</h2>
              </div>
              <div className="trace-card__readout">
                <span className="trace-card__readout-dot"></span>
                <span id="traceSnapshot">Snapshot as of {snapshotDate}</span>
              </div>
            </div>
            <div className="trace-card__scope" id="traceScope">
              {trace === null ? (
                <div className="analytics-empty">
                  <p>No job sheets yet — create one from the dashboard to see the intake trend here.</p>
                </div>
              ) : (
                <svg viewBox={`0 0 ${trace.width} ${trace.height}`} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="traceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {trace.gridLines.map((g, i) => (
                    <g key={i}>
                      <line className="trace-grid-line" x1={trace.padL} y1={g.y.toFixed(1)} x2={trace.width - trace.padR} y2={g.y.toFixed(1)}></line>
                      <text className="trace-axis-label" x={trace.padL - 8} y={(g.y + 3).toFixed(1)} textAnchor="end">
                        {g.value}
                      </text>
                    </g>
                  ))}
                  <path className="trace-area" d={trace.areaPath}></path>
                  <path className="trace-line-glow" d={trace.linePath}></path>
                  <path className="trace-line" d={trace.linePath}></path>
                  {trace.dots.map((p, i) => (
                    <circle key={i} className="trace-point" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.6"></circle>
                  ))}
                  <circle className="trace-point--last-ring" cx={trace.last.x.toFixed(1)} cy={trace.last.y.toFixed(1)} r="4"></circle>
                  <circle className="trace-point--last" cx={trace.last.x.toFixed(1)} cy={trace.last.y.toFixed(1)} r="3.4"></circle>
                  {trace.xLabels.map((l, i) => (
                    <text key={i} className="trace-axis-label" x={l.x.toFixed(1)} y={trace.height - 6} textAnchor="middle">
                      {l.label}
                    </text>
                  ))}
                </svg>
              )}
            </div>
          </section>

          <section className="split-row">
            <div className="panel-card">
              <div className="panel-card__head">
                <p className="panel-card__eyebrow">Status breakdown</p>
                <h3>Where every job sheet stands</h3>
              </div>
              <div className="donut-wrap">
                <div className="donut-svg-wrap" id="donutWrap">
                  <svg viewBox="0 0 168 168">
                    <circle cx={donut.cx} cy={donut.cy} r={donut.r} fill="none" stroke="var(--surface-2)" strokeWidth={donut.strokeWidth}></circle>
                    {donut.segments.map((seg) => (
                      <circle
                        key={seg.key}
                        cx={donut.cx}
                        cy={donut.cy}
                        r={donut.r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={donut.strokeWidth}
                        strokeDasharray={seg.dasharray}
                        strokeDashoffset={seg.dashoffset}
                        strokeLinecap="butt"
                      ></circle>
                    ))}
                  </svg>
                  <div className="donut-center">
                    <div className="donut-center__value">{donut.total}</div>
                    <div className="donut-center__label">Total</div>
                  </div>
                </div>
                <div className="donut-legend" id="donutLegend">
                  {donut.statuses.map((s, i) => (
                    <div className="donut-legend__row" key={s}>
                      <span className="donut-legend__left">
                        <span className="donut-legend__swatch" style={{ background: ANALYTICS_STATUS_META[s].swatch }}></span>
                        {ANALYTICS_STATUS_META[s].label}
                      </span>
                      <span className="donut-legend__count">{donut.counts[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-card__head">
                <p className="panel-card__eyebrow">Branch load</p>
                <h3>Job sheets by location</h3>
              </div>
              <div className="branch-bars" id="branchBars">
                {branchBarData.length === 0 ? (
                  <div className="analytics-empty">
                    <p>No branch assigned to this account.</p>
                  </div>
                ) : (
                  branchBarData.map((row) => (
                    <div className="branch-bar-row" key={row.branch}>
                      <div className="branch-bar-row__head">
                        <span className="branch-bar-row__name">
                          <span className="branch-bar-row__initial">{row.branch[0]}</span> {row.branch}
                        </span>
                        <span className="branch-bar-row__count">{row.count}</span>
                      </div>
                      <div className="branch-bar-track">
                        <div className="branch-bar-fill" style={{ width: `${row.width}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="split-row">
            <div className="panel-card">
              <div className="panel-card__head">
                <p className="panel-card__eyebrow">ETA outlook</p>
                <h3>What's due, and what's overdue</h3>
              </div>
              <div className="eta-strip" id="etaStrip">
                {etaCards.map((c) => (
                  <div className={`eta-card ${c.cls}`} key={c.label}>
                    <div className="eta-card__label">{c.label}</div>
                    <div className="eta-card__value">{c.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-card__head">
                <p className="panel-card__eyebrow">Repair outcome</p>
                <h3>Closed jobs — repaired vs unrepaired</h3>
              </div>
              <div className="repair-strip" id="repairStrip">
                {repairOutcome.total === 0 ? (
                  <div className="analytics-empty">
                    <p>No closed jobs in scope yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="repair-bar-track">
                      <div className="repair-bar-fill" style={{ width: `${repairOutcome.repairedPct}%` }}></div>
                    </div>
                    <div className="repair-legend">
                      <span>
                        <span className="repair-dot repair-dot--ok"></span>Repaired · {repairOutcome.repaired}
                      </span>
                      <span>
                        <span className="repair-dot repair-dot--bad"></span>Unrepaired · {repairOutcome.unrepaired}
                      </span>
                      <span className="repair-legend__pct">{repairOutcome.repairedPct}% repaired</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
