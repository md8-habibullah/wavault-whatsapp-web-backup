// RFC 4180 CSV with spreadsheet formula-injection protection.

const PHONE_LIKE = /^[+-]?[\d\s().-]+$/;

/** Neutralise cells a spreadsheet would run as a formula (=, @, or +/- not followed by a phone/number). */
export function sanitizeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/^[=@\t\r]/.test(s)) return `'${s}`;
  if (/^[+-]/.test(s) && !PHONE_LIKE.test(s)) return `'${s}`;
  return s;
}

export function csvCell(value, delimiter = ',') {
  const s = sanitizeCell(value);
  return s.includes(delimiter) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV({ headers, rows }, { delimiter = ',', bom = true } = {}) {
  const lines = [headers, ...rows].map((r) => r.map((v) => csvCell(v, delimiter)).join(delimiter));
  return (bom ? '\uFEFF' : '') + lines.join('\r\n') + '\r\n';
}
