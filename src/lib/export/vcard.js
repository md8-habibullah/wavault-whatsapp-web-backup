// vCard 3.0 (Android, iPhone/iCloud, Google, Outlook) and vCard 4.0 (RFC 6350).
import { toE164 } from '../model.js';

export const escapeValue = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const encoder = new TextEncoder();

/** Fold lines longer than 75 octets without splitting a UTF-8 character (RFC 6350 §3.2). */
export function foldLine(line) {
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function noteFor(c) {
  const bits = [];
  if (c.pushname && c.pushname !== c.name) bits.push(`WhatsApp name: ${c.pushname}`);
  if (c.username) bits.push(`Username: @${c.username}`);
  if (c.about) bits.push(`About: ${c.about}`);
  if (c.groups?.length) bits.push(`Groups: ${c.groups.join(', ')}`);
  if (c.onWhatsApp === false) bits.push('Not on WhatsApp');
  return bits.join('\n');
}

function card(c, version) {
  const name = c.name || c.businessName || c.pushname || toE164(c.phone);
  const lines = ['BEGIN:VCARD', `VERSION:${version}`, `FN:${escapeValue(name)}`, `N:;${escapeValue(name)};;;`];
  if (version === '4.0') lines.push(`TEL;VALUE=uri;TYPE="cell,voice":tel:${toE164(c.phone)}`);
  else lines.push(`TEL;TYPE=CELL:${toE164(c.phone)}`);
  if (c.businessName) lines.push(`ORG:${escapeValue(c.businessName)}`);
  if (c.pushname && c.pushname !== name) lines.push(`NICKNAME:${escapeValue(c.pushname)}`);
  if (c.labels?.length) lines.push(`CATEGORIES:${c.labels.map(escapeValue).join(',')}`);
  if (c.onWhatsApp !== false) lines.push(`URL:https://wa.me/${c.phone}`);
  const note = noteFor(c);
  if (note) lines.push(`NOTE:${escapeValue(note)}`);
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n');
}

/** Contacts without a visible phone number are skipped (nothing to dial); `skipped` reports how many. */
export function toVCard(contacts, { version = '3.0' } = {}) {
  const withPhone = contacts.filter((c) => c.phone);
  return {
    text: withPhone.map((c) => card(c, version)).join('\r\n') + (withPhone.length ? '\r\n' : ''),
    count: withPhone.length,
    skipped: contacts.length - withPhone.length,
  };
}
