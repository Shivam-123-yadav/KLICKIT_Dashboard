export function parseDateString(value) {
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
  const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mon);
  if (monthIndex === -1) return null;
  const d = Number(day);
  const y = Number(year);
  if (!d || !y) return null;
  return new Date(y, monthIndex, d);
}

export function isSameLocalDay(dateA, dateB) {
  return (
    dateA &&
    dateB &&
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((b - a) / MS);
}

export function formatDateInput(value) {
  const date = parseDateString(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDisplay(value) {
  const date = parseDateString(value);
  if (!date) return value || "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
