export const IST = "Asia/Kolkata";
export const REPORT_MAX_RANGE_DAYS = 90;
export const REPORT_MAX_ROWS = 5000;

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

export function daysAgoIso(days: number) {
  const [year, month, day] = todayIso().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function thisMonthStartIso() {
  return `${todayIso().slice(0, 7)}-01`;
}

export function lastMonthRange() {
  const [year, month] = thisMonthStartIso().split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, 0));
  const start = new Date(Date.UTC(year, month - 2, 1));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function inclusiveDays(from: string, to: string) {
  if (!from || !to) return 0;
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T00:00:00+05:30`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function formatIstDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = value.length <= 10 ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
}

export function formatIstDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: IST,
  });
}

function moneyNumber(amount: number | null | undefined) {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** UI money: rupee sign + Indian grouping, always 2 decimals. */
export function formatInr(amount: number | null | undefined) {
  return `₹${moneyNumber(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Excel/PDF money: ASCII so Helvetica and older Excel encodings do not scramble the label. */
export function formatInrExport(amount: number | null | undefined) {
  return `Rs. ${moneyNumber(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** jsPDF Helvetica is WinAnsi - ₹, · and similar glyphs corrupt the following letters. */
export function pdfSafe(value: unknown) {
  return String(value ?? "")
    .replaceAll("₹", "Rs. ")
    .replaceAll("·", " | ")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("\u202f", " ")
    .replaceAll("\u00a0", " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

export function generatedAtIst() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: IST,
    timeZoneName: "short",
  });
}
