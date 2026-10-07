const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-IN");

/** ₹50,00,000 */
export function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return inr.format(Number(value));
}

/** ₹50 L, ₹1.25 Cr — Indian compact notation */
export function formatINRCompact(value) {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const trim = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.?0+$/, "");
  if (abs >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (abs >= 1e5) return `₹${trim(n / 1e5)} L`;
  if (abs >= 1e3) return `₹${trim(n / 1e3)}K`;
  return inr.format(n);
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  return number.format(Number(value));
}

export function formatPercent(value, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

// Parse "YYYY-MM-DD" as a local date so it doesn't shift across time zones.
export function parseDate(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    return new Date(y, m - 1, d, hh, mm, ss);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN", opts) : "—";
}

export function formatDateTime(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}

export function formatRelative(value, now = new Date()) {
  const date = parseDate(value);
  if (!date) return "—";
  const diff = (date.getTime() - now.getTime()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "just now";
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
}

// Stable, pleasant avatar colors derived from a string.
const AVATAR_COLORS = ["#0f766e", "#15803d", "#1d4ed8", "#7c3aed", "#be185d", "#c2410c", "#0e7490", "#4d7c0f"];

export function avatarColor(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
