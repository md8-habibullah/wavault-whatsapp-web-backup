import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildContacts } from '../src/lib/model.js';
import { CONTACT_COLUMNS, GROUP_COLUMNS, tabulate } from '../src/lib/export/columns.js';
import { csvCell, sanitizeCell, toCSV } from '../src/lib/export/csv.js';
import { foldLine, toVCard } from '../src/lib/export/vcard.js';
import { GOOGLE_HEADERS, OUTLOOK_HEADERS, toGoogleCSV, toOutlookCSV } from '../src/lib/export/address-books.js';
import { colName, sheetName, toXLSX } from '../src/lib/export/xlsx.js';
import { buildExport, datedName, FORMATS } from '../src/lib/export/index.js';
import { snapshot } from './fixtures.js';

const contacts = buildContacts(snapshot).filter((c) => !c.isMe);
const defaults = CONTACT_COLUMNS.filter((c) => c.default);

/** Minimal RFC 4180 parser for round-trip checks. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += ch;
  }
  return rows;
}

describe('CSV', () => {
  it('neutralises formulas but keeps phone numbers', () => {
    expect(sanitizeCell('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(sanitizeCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(sanitizeCell('+8801711111111')).toBe('+8801711111111');
    expect(sanitizeCell('-cmd|x')).toBe(`'-cmd|x`);
    expect(sanitizeCell('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
  });

  it('quotes commas, quotes and newlines and round-trips', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    const csv = toCSV(tabulate(contacts, defaults));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const rows = parseCSV(csv);
    expect(rows[0]).toEqual(defaults.map((c) => c.label));
    expect(rows).toHaveLength(contacts.length + 1);
    const acme = rows.find((r) => r.includes('+15551234567'));
    expect(acme[1]).toBe('Acme, "Tree" Care; LLC');
    expect(rows.some((r) => r[0] === 'রহিম উদ্দিন')).toBe(true);
  });
});

describe('vCard', () => {
  it('writes valid 3.0 cards with escaping and skips hidden numbers', () => {
    const v = toVCard(contacts);
    expect(v.skipped).toBe(1);
    expect(v.count).toBe(5);
    expect(v.text.match(/BEGIN:VCARD/g)).toHaveLength(5);
    expect(v.text).toContain('FN:Acme\\, "Tree" Care\\; LLC');
    expect(v.text).toContain('TEL;TYPE=CELL:+15551234567');
    expect(v.text).toContain('ORG:Acme Tree Care');
    expect(v.text).toContain('CATEGORIES:New customer');
    expect(v.text).not.toMatch(/[^\r]\n/); // CRLF only
    expect(v.text).toContain('FN:রহিম উদ্দিন');
  });

  it('writes 4.0 tel URIs', () => {
    expect(toVCard(contacts, { version: '4.0' }).text).toContain('TEL;VALUE=uri;TYPE="cell,voice":tel:+8801711111111');
  });

  it('folds long lines at 75 octets without splitting characters', () => {
    const long = 'NOTE:' + 'আ'.repeat(60);
    const folded = foldLine(long);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long);
  });
});

describe('Google and Outlook CSV', () => {
  it('uses the import headers and fills phone, name, labels', () => {
    const g = parseCSV(toGoogleCSV(contacts));
    expect(g[0]).toEqual(GOOGLE_HEADERS);
    const acme = g.find((r) => r[GOOGLE_HEADERS.indexOf('Phone 1 - Value')] === '+15551234567');
    expect(acme[GOOGLE_HEADERS.indexOf('Organization Name')]).toBe('Acme Tree Care');
    expect(acme[GOOGLE_HEADERS.indexOf('Labels')]).toBe('WhatsApp ::: Paid');
    expect(g).toHaveLength(6);

    const o = parseCSV(toOutlookCSV(contacts));
    expect(o[0]).toEqual(OUTLOOK_HEADERS);
    expect(o.some((r) => r[OUTLOOK_HEADERS.indexOf('Mobile Phone')] === '+8801812345678')).toBe(true);
  });
});

describe('XLSX', () => {
  it('produces a valid workbook with text cells, frozen header and unique sheet names', () => {
    expect(colName(0)).toBe('A');
    expect(colName(25)).toBe('Z');
    expect(colName(26)).toBe('AA');
    const used = new Set();
    expect(sheetName('a/b:c?', used)).toBe('a b c');
    expect(sheetName('a b c', used)).toBe('a b c (2)');

    const bytes = toXLSX([{ name: 'Contacts', ...tabulate(contacts, defaults) }, { name: 'Contacts', headers: ['x'], rows: [] }]);
    const files = unzipSync(bytes);
    for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) {
      expect(files[f], f).toBeTruthy();
    }
    const parser = new DOMParser();
    for (const [name, data] of Object.entries(files)) {
      const doc = parser.parseFromString(strFromU8(data), 'application/xml');
      expect(doc.getElementsByTagName('parsererror'), name).toHaveLength(0);
    }
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('<t xml:space="preserve">+15551234567</t>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('রহিম উদ্দিন');
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="Contacts (2)"');
  });
});

describe('buildExport', () => {
  it('builds every format for contacts', () => {
    for (const f of FORMATS) {
      const out = buildExport({ kind: 'contacts', records: contacts, columns: defaults, format: f.id, title: 'contacts all' });
      expect(out.filename).toMatch(new RegExp(`^wavault-contacts-all-\\d{4}-\\d{2}-\\d{2}\\.${f.ext}$`));
      if (f.id === 'pdf') expect(out.table.rows).toHaveLength(contacts.length);
      else expect(out.data.length).toBeGreaterThan(10);
    }
  });

  it('JSON keeps the selected columns and the raw data', () => {
    const doc = JSON.parse(buildExport({ kind: 'contacts', records: contacts, columns: defaults, format: 'json', title: 'x' }).data);
    expect(doc.count).toBe(6);
    expect(Object.keys(doc.items[0])).toEqual(defaults.map((c) => c.id));
    expect(doc.raw[0].key).toBeTruthy();
  });

  it('numbers list removes duplicates and hidden numbers', () => {
    const out = buildExport({ kind: 'contacts', records: [...contacts, contacts[0]], columns: defaults, format: 'txt', title: 'x' });
    expect(out.data.trim().split('\r\n')).toHaveLength(5);
    expect(out.note).toMatch(/2 duplicates or hidden/);
  });

  it('refuses people formats for the group list but allows tables', () => {
    expect(() => buildExport({ kind: 'groups', records: snapshot.groups, columns: GROUP_COLUMNS, format: 'vcf3', title: 'g' })).toThrow(/group members/);
    const html = buildExport({ kind: 'groups', records: snapshot.groups, columns: GROUP_COLUMNS, format: 'html', title: 'groups' }).data;
    expect(html).toContain('Tree Crew');
  });

  it('makes safe dated file names', () => {
    expect(datedName('a/b:c  d', 'csv', new Date(2026, 9, 19))).toBe('a-b-c-d-2026-10-19.csv');
  });
});
