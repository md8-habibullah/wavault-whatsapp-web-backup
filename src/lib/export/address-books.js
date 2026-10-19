// Import-ready CSV layouts for Google Contacts and Microsoft Outlook.
import { toE164 } from '../model.js';
import { toCSV } from './csv.js';

const fullName = (c) => c.name || c.businessName || c.pushname || toE164(c.phone);

function notes(c) {
  return [
    c.pushname && c.pushname !== c.name ? `WhatsApp name: ${c.pushname}` : null,
    c.username ? `Username: @${c.username}` : null,
    c.about ? `About: ${c.about}` : null,
    c.labels?.length ? `WhatsApp labels: ${c.labels.join(', ')}` : null,
    c.groups?.length ? `Groups: ${c.groups.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

// Header row of Google Contacts' own "Google CSV" export (contacts.google.com), which its importer reads.
export const GOOGLE_HEADERS = [
  'First Name', 'Middle Name', 'Last Name', 'Phonetic First Name', 'Phonetic Middle Name', 'Phonetic Last Name',
  'Name Prefix', 'Name Suffix', 'Nickname', 'File As', 'Organization Name', 'Organization Title',
  'Organization Department', 'Birthday', 'Notes', 'Photo', 'Labels', 'E-mail 1 - Label', 'E-mail 1 - Value',
  'Phone 1 - Label', 'Phone 1 - Value', 'Website 1 - Label', 'Website 1 - Value',
];

export function toGoogleCSV(contacts, { groupLabel = 'WhatsApp' } = {}) {
  const rows = contacts
    .filter((c) => c.phone)
    .map((c) => {
      const row = Object.fromEntries(GOOGLE_HEADERS.map((h) => [h, '']));
      row['First Name'] = fullName(c);
      row['File As'] = fullName(c);
      row.Nickname = c.pushname && c.pushname !== c.name ? c.pushname : '';
      row['Organization Name'] = c.businessName || '';
      row.Notes = notes(c);
      row.Labels = [groupLabel, ...(c.labels || [])].filter(Boolean).join(' ::: ');
      row['Phone 1 - Label'] = 'Mobile';
      row['Phone 1 - Value'] = toE164(c.phone);
      if (c.onWhatsApp !== false) {
        row['Website 1 - Label'] = 'WhatsApp';
        row['Website 1 - Value'] = `https://wa.me/${c.phone}`;
      }
      return GOOGLE_HEADERS.map((h) => row[h]);
    });
  return toCSV({ headers: GOOGLE_HEADERS, rows });
}

// Outlook.com / Outlook desktop import template columns.
export const OUTLOOK_HEADERS = [
  'First Name', 'Middle Name', 'Last Name', 'Title', 'Suffix', 'Nickname', 'Given Yomi', 'Surname Yomi',
  'E-mail Address', 'E-mail 2 Address', 'E-mail 3 Address', 'Home Phone', 'Home Phone 2', 'Business Phone',
  'Business Phone 2', 'Mobile Phone', 'Car Phone', 'Other Phone', 'Primary Phone', 'Pager', 'Business Fax',
  'Home Fax', 'Other Fax', 'Company Main Phone', 'Callback', 'Radio Phone', 'Telex', 'TTY/TDD Phone', 'IMAddress',
  'Job Title', 'Department', 'Company', 'Office Location', "Manager's Name", "Assistant's Name",
  "Assistant's Phone", 'Company Yomi', 'Business Street', 'Business City', 'Business State',
  'Business Postal Code', 'Business Country/Region', 'Home Street', 'Home City', 'Home State', 'Home Postal Code',
  'Home Country/Region', 'Other Street', 'Other City', 'Other State', 'Other Postal Code', 'Other Country/Region',
  'Personal Web Page', 'Spouse', 'Schools', 'Hobby', 'Location', 'Web Page', 'Birthday', 'Anniversary', 'Notes',
];

export function toOutlookCSV(contacts) {
  const rows = contacts
    .filter((c) => c.phone)
    .map((c) => {
      const row = Object.fromEntries(OUTLOOK_HEADERS.map((h) => [h, '']));
      row['First Name'] = fullName(c);
      row.Nickname = c.pushname && c.pushname !== c.name ? c.pushname : '';
      row['Mobile Phone'] = toE164(c.phone);
      row.Company = c.businessName || '';
      row['Web Page'] = c.onWhatsApp !== false ? `https://wa.me/${c.phone}` : '';
      row.Notes = notes(c);
      return OUTLOOK_HEADERS.map((h) => row[h]);
    });
  return toCSV({ headers: OUTLOOK_HEADERS, rows });
}
