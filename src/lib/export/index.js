// One entry point for every table-style export (contacts, group members, group list).
import { toE164 } from '../model.js';
import { tabulate } from './columns.js';
import { toCSV } from './csv.js';
import { toXLSX } from './xlsx.js';
import { toVCard } from './vcard.js';
import { toGoogleCSV, toOutlookCSV } from './address-books.js';
import { toHTMLReport } from './html-report.js';

export const FORMATS = [
  { id: 'csv', label: 'CSV', hint: 'Any spreadsheet app', ext: 'csv', mime: 'text/csv;charset=utf-8', people: false },
  { id: 'xlsx', label: 'Excel', hint: '.xlsx workbook', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', people: false },
  { id: 'json', label: 'JSON', hint: 'Full data, for developers', ext: 'json', mime: 'application/json', people: false },
  { id: 'vcf3', label: 'vCard 3.0', hint: 'Android, iPhone, iCloud', ext: 'vcf', mime: 'text/vcard;charset=utf-8', people: true },
  { id: 'vcf4', label: 'vCard 4.0', hint: 'Newer contact apps', ext: 'vcf', mime: 'text/vcard;charset=utf-8', people: true },
  { id: 'google', label: 'Google Contacts', hint: 'contacts.google.com import', ext: 'csv', mime: 'text/csv;charset=utf-8', people: true },
  { id: 'outlook', label: 'Outlook', hint: 'Outlook / Microsoft 365 import', ext: 'csv', mime: 'text/csv;charset=utf-8', people: true },
  { id: 'txt', label: 'Numbers list', hint: 'One number per line', ext: 'txt', mime: 'text/plain;charset=utf-8', people: true },
  { id: 'html', label: 'HTML table', hint: 'Open in any browser', ext: 'html', mime: 'text/html;charset=utf-8', people: false },
  { id: 'pdf', label: 'PDF', hint: 'Print or save as PDF', ext: 'pdf', mime: null, people: false },
];

export const formatById = (id) => FORMATS.find((f) => f.id === id);

export function datedName(base, ext, date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  const safeBase = String(base).normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'export';
  return `${safeBase}-${stamp}.${ext}`;
}

/**
 * @param {object} p
 * @param {'contacts'|'members'|'groups'} p.kind
 * @param {object[]} p.records
 * @param {object[]} p.columns  selected column definitions
 * @param {string} p.format     id from FORMATS
 * @param {string} p.title      human title used for file name + report heading
 * @param {object[]} [p.sheets] optional extra sheets for xlsx: [{ name, records }]
 * @returns {{ data: string|Uint8Array, filename: string, mime: string, note?: string, table?: object }}
 */
export function buildExport({ kind, records, columns, format, title, sheets }) {
  const f = formatById(format);
  if (!f) throw new Error(`Unknown format ${format}`);
  if (f.people && kind === 'groups') throw new Error(`${f.label} is for people. Export group members instead.`);
  const filename = datedName(`wavault-${title}`, f.ext);
  const subtitle = `${records.length} ${kind === 'groups' ? 'groups' : 'people'}, exported ${new Date().toLocaleString()}`;
  const table = () => ({ title, subtitle, ...tabulate(records, columns) });

  switch (format) {
    case 'csv':
      return { data: toCSV(tabulate(records, columns)), filename, mime: f.mime };
    case 'xlsx': {
      const extra = (sheets || []).map((s) => ({ name: s.name, ...tabulate(s.records, columns) }));
      return { data: toXLSX([{ name: title, ...tabulate(records, columns) }, ...extra]), filename, mime: f.mime };
    }
    case 'json': {
      const items = records.map((r) => Object.fromEntries(columns.map((c) => [c.id, c.get(r) ?? null])));
      const doc = { app: 'WAVault', kind, title, exportedAt: new Date().toISOString(), count: records.length, columns: columns.map((c) => ({ id: c.id, label: c.label })), items, raw: records };
      return { data: JSON.stringify(doc, null, 2), filename, mime: f.mime };
    }
    case 'vcf3':
    case 'vcf4': {
      const v = toVCard(records, { version: format === 'vcf4' ? '4.0' : '3.0' });
      return { data: v.text, filename, mime: f.mime, note: v.skipped ? `${v.skipped} without a visible phone number were left out.` : undefined };
    }
    case 'google':
    case 'outlook': {
      const skipped = records.filter((r) => !r.phone).length;
      return { data: format === 'google' ? toGoogleCSV(records) : toOutlookCSV(records), filename, mime: f.mime, note: skipped ? `${skipped} without a visible phone number were left out.` : undefined };
    }
    case 'txt': {
      const nums = [...new Set(records.map((r) => toE164(r.phone)).filter(Boolean))];
      return { data: nums.join('\r\n') + (nums.length ? '\r\n' : ''), filename, mime: f.mime, note: nums.length < records.length ? `${records.length - nums.length} duplicates or hidden numbers left out.` : undefined };
    }
    case 'html':
      return { data: toHTMLReport(table()), filename, mime: f.mime };
    case 'pdf':
      return { data: null, filename, mime: null, table: table() };
    default:
      throw new Error(`Unhandled format ${format}`);
  }
}
