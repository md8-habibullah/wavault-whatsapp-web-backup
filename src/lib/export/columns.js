// Column definitions shared by the table-style exporters (CSV, XLSX, JSON, HTML).
import { toE164 } from '../model.js';

const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '');
export const formatDate = (unixSeconds) => {
  if (!unixSeconds) return '';
  const d = new Date(unixSeconds * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const CONTACT_COLUMNS = [
  { id: 'displayName', label: 'Display name', get: (c) => c.displayName, default: true },
  { id: 'name', label: 'Saved name', get: (c) => c.name, default: true },
  { id: 'phone', label: 'Phone', get: (c) => toE164(c.phone), default: true },
  { id: 'pushname', label: 'WhatsApp profile name', get: (c) => c.pushname, default: true },
  { id: 'businessName', label: 'Business name', get: (c) => c.businessName, default: true },
  { id: 'username', label: 'Username', get: (c) => (c.username ? `@${c.username}` : ''), default: true },
  { id: 'isSaved', label: 'Saved', get: (c) => yesNo(c.isSaved), default: true },
  { id: 'onWhatsApp', label: 'On WhatsApp', get: (c) => yesNo(c.onWhatsApp), default: true },
  { id: 'isBusiness', label: 'Business account', get: (c) => yesNo(c.isBusiness), default: true },
  { id: 'hasChat', label: 'Has chat', get: (c) => yesNo(c.hasChat), default: true },
  { id: 'unreadCount', label: 'Unread messages', get: (c) => (c.hasChat ? c.unreadCount : ''), default: false },
  { id: 'lastChatAt', label: 'Last chat', get: (c) => formatDate(c.lastChatAt), default: false },
  { id: 'labels', label: 'Labels', get: (c) => c.labels.join('; '), default: true },
  { id: 'groups', label: 'Groups', get: (c) => c.groups.join('; '), default: false },
  { id: 'about', label: 'About', get: (c) => c.about, default: false },
  { id: 'shortName', label: 'First name', get: (c) => c.shortName, default: false },
  { id: 'isBlocked', label: 'Blocked', get: (c) => yesNo(c.isBlocked), default: false },
  { id: 'lid', label: 'WhatsApp LID', get: (c) => c.lid, default: false },
  { id: 'waLink', label: 'wa.me link', get: (c) => (c.phone ? `https://wa.me/${c.phone}` : ''), default: false },
  { id: 'sources', label: 'Found in', get: (c) => c.sources.join('; '), default: false },
];

export const MEMBER_COLUMNS = [
  { id: 'group', label: 'Group', get: (m) => m.group, default: true },
  { id: 'role', label: 'Role', get: (m) => m.role, default: true },
  ...CONTACT_COLUMNS.filter((c) => c.id !== 'groups'),
];

export const GROUP_COLUMNS = [
  { id: 'subject', label: 'Group name', get: (g) => g.subject, default: true },
  { id: 'size', label: 'Members', get: (g) => g.size, default: true },
  { id: 'admins', label: 'Admins', get: (g) => g.participants.filter((p) => p.isAdmin || p.isSuperAdmin).length || '', default: true },
  { id: 'myRole', label: 'My role', get: (g) => (g.iAmAdmin ? 'Admin' : g.iAmMember ? 'Member' : 'Left'), default: true },
  { id: 'createdAt', label: 'Created', get: (g) => formatDate(g.createdAt), default: true },
  { id: 'owner', label: 'Created by', get: (g) => (/^\d+$/.test(g.owner || '') ? toE164(g.owner) : g.owner), default: true },
  { id: 'isCommunity', label: 'Community', get: (g) => yesNo(g.isCommunity), default: false },
  { id: 'announceOnly', label: 'Only admins can send', get: (g) => yesNo(g.announceOnly), default: false },
  { id: 'lastActivity', label: 'Last activity', get: (g) => formatDate(g.lastActivity), default: true },
  { id: 'description', label: 'Description', get: (g) => g.description, default: false },
  { id: 'id', label: 'Group ID', get: (g) => g.id, default: false },
];

/** Turns records into { headers, rows } of plain strings/numbers. */
export function tabulate(records, columns) {
  return {
    headers: columns.map((c) => c.label),
    rows: records.map((r) => columns.map((c) => {
      const v = c.get(r);
      return v === null || v === undefined ? '' : v;
    })),
  };
}
