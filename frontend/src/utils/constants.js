export const API_BASE = "/api/generic";

export const BRANCHES = ["Andheri", "Thane", "Dadar", "Vashi"];

export function branchSlug(name) {
  return String(name).toLowerCase().replace(/\s+/g, "-");
}

// Full status metadata used on the dashboard (includes Repaired/Unrepaired,
// which are admin-only derived filters, not real statuses on the record).
export const STATUS_META = {
  Pending: { key: "pending", label: "Pending", swatch: "var(--amber)" },
  "Approved Pending": { key: "approved-pending", label: "For Approval", swatch: "#e7c76b" },
  Approved: { key: "approved", label: "Approved", swatch: "var(--teal)" },
  Rejected: { key: "rejected", label: "Rejected", swatch: "var(--coral)" },
  Ready: { key: "ready", label: "Ready", swatch: "var(--blue)" },
  Closed: { key: "closed", label: "Closed", swatch: "var(--slate)" },
  Repaired: { key: "repaired", label: "Repaired", swatch: "var(--teal)" },
  Unrepaired: { key: "unrepaired", label: "Unrepaired", swatch: "var(--coral)" },
};

// Trimmed-down status metadata used on the analytics page (no derived
// repair pseudo-statuses — repair outcome gets its own panel there).
export const ANALYTICS_STATUS_META = {
  Pending: { label: "Pending", swatch: "var(--amber)" },
  Ready: { label: "Ready", swatch: "var(--branch-andheri)" },
  "Approved Pending": { label: "For Approval", swatch: "#e7c76b" },
  Approved: { label: "Approved", swatch: "var(--teal)" },
  Closed: { label: "Closed", swatch: "var(--slate)" },
  Rejected: { label: "Rejected", swatch: "var(--coral)" },
};

// Hex fallbacks for the SVG donut, which can't resolve CSS custom properties
// through stroke-dasharray math the way the browser resolves them for paint.
export const STATUS_HEX = {
  Pending: "#f0a83c",
  Ready: "#6c9ef7",
  "Approved Pending": "#e7c76b",
  Approved: "#3fd6b6",
  Closed: "#8891a0",
  Rejected: "#ef6a63",
};

export const ETA_FILTERS = ["All", "Today", "Tomorrow"];
export const ITEMS_PER_PAGE = 20;
export const RANGE_OPTIONS = [7, 14, 30, 90];
