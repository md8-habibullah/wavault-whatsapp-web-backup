// Contact filtering: tri-state facets + group/label selections + free-text search.
import { digitsOnly } from './model.js';

/** Facet tests. Each facet is 'any' | 'yes' | 'no'. */
export const FACETS = {
  saved: { label: 'Saved in address book', test: (c) => c.isSaved },
  onWhatsApp: { label: 'On WhatsApp', test: (c) => c.onWhatsApp === true },
  chatted: { label: 'Has a chat', test: (c) => c.hasChat },
  unread: { label: 'Unread chat', test: (c) => c.unreadCount > 0 },
  username: { label: 'Has username', test: (c) => !!c.username },
  business: { label: 'Business account', test: (c) => c.isBusiness },
  groupMember: { label: 'In my groups', test: (c) => c.groups.length > 0 },
  phoneKnown: { label: 'Phone number visible', test: (c) => !!c.phone },
  blocked: { label: 'Blocked', test: (c) => c.isBlocked },
};

const any = () => Object.fromEntries(Object.keys(FACETS).map((k) => [k, 'any']));

/** One-click presets covering every list the user asked for. */
export const PRESETS = [
  { id: 'all', label: 'All contacts', facets: {} },
  { id: 'saved', label: 'Saved', facets: { saved: 'yes' } },
  { id: 'unsaved', label: 'Unsaved', facets: { saved: 'no', onWhatsApp: 'yes' } },
  { id: 'onWhatsApp', label: 'On WhatsApp', facets: { onWhatsApp: 'yes' } },
  { id: 'invite', label: 'Invite list', facets: { onWhatsApp: 'no' } },
  { id: 'chatted', label: 'Chatted', facets: { chatted: 'yes' } },
  { id: 'unread', label: 'Unread chats', facets: { chatted: 'yes', unread: 'yes' } },
  { id: 'read', label: 'Read chats', facets: { chatted: 'yes', unread: 'no' } },
  { id: 'withUsername', label: 'With username', facets: { username: 'yes' } },
  { id: 'withoutUsername', label: 'Without username', facets: { username: 'no', onWhatsApp: 'yes' } },
  { id: 'business', label: 'Business', facets: { business: 'yes' } },
  { id: 'personal', label: 'Personal', facets: { business: 'no', onWhatsApp: 'yes' } },
  { id: 'groupMembers', label: 'Group members', facets: { groupMember: 'yes' } },
  { id: 'hiddenNumber', label: 'Hidden number', facets: { phoneKnown: 'no' } },
  { id: 'blocked', label: 'Blocked', facets: { blocked: 'yes' } },
];

export function presetState(presetId) {
  const p = PRESETS.find((x) => x.id === presetId) || PRESETS[0];
  return { ...any(), ...p.facets };
}

export const emptyFilter = () => ({ facets: any(), groups: [], labels: [], search: '', excludeMe: true });

function matchesSearch(c, q) {
  if (!q) return true;
  // A query made only of number characters ("+44 7700 900", "(555) 123") is matched as one phone number.
  const qd = digitsOnly(q);
  if (/^[\d\s+().-]+$/.test(q) && qd.length >= 3) return (c.phone || '').includes(qd) || (c.lid || '').includes(qd);
  const terms = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const hay = [c.displayName, c.name, c.shortName, c.pushname, c.businessName, c.username && `@${c.username}`, c.about, ...c.labels, ...c.groups]
    .filter(Boolean)
    .join(' \u0001 ')
    .toLocaleLowerCase();
  return terms.every((t) => {
    if (hay.includes(t)) return true;
    const d = digitsOnly(t);
    return d.length >= 3 && d.length === t.replace(/[\s+()-]/g, '').length && ((c.phone || '').includes(d) || (c.lid || '').includes(d));
  });
}

export function applyFilter(contacts, filter) {
  const facets = Object.entries(filter.facets || {}).filter(([, v]) => v !== 'any');
  const groups = new Set(filter.groups || []);
  const labels = new Set(filter.labels || []);
  return contacts.filter((c) => {
    if (filter.excludeMe && c.isMe) return false;
    for (const [k, v] of facets) {
      const ok = !!FACETS[k]?.test(c);
      if ((v === 'yes') !== ok) return false;
    }
    if (groups.size && !c.groups.some((g) => groups.has(g))) return false;
    if (labels.size && !c.labels.some((l) => labels.has(l))) return false;
    return matchesSearch(c, filter.search?.trim());
  });
}

export function presetCounts(contacts) {
  const base = contacts.filter((c) => !c.isMe);
  return Object.fromEntries(PRESETS.map((p) => [p.id, applyFilter(base, { ...emptyFilter(), facets: presetState(p.id) }).length]));
}

// ---------- chats ----------

export const CHAT_PRESETS = [
  { id: 'all', label: 'All chats', test: () => true },
  { id: 'unread', label: 'Unread', test: (c) => c.unreadCount !== 0 },
  { id: 'read', label: 'Read', test: (c) => c.unreadCount === 0 },
  { id: 'user', label: 'Individual', test: (c) => c.kind === 'user' },
  { id: 'group', label: 'Groups', test: (c) => c.kind === 'group' },
  { id: 'archived', label: 'Archived', test: (c) => c.archived },
  { id: 'pinned', label: 'Pinned', test: (c) => c.pinned },
  { id: 'channel', label: 'Channels & broadcasts', test: (c) => c.kind === 'channel' || c.kind === 'broadcast' },
];

export function filterChats(chats, presetId, search, labelIds = []) {
  const preset = CHAT_PRESETS.find((p) => p.id === presetId) || CHAT_PRESETS[0];
  const q = (search || '').trim().toLocaleLowerCase();
  const labels = new Set(labelIds.map(String));
  return chats.filter(
    (c) =>
      preset.test(c) &&
      (!labels.size || c.labels.some((l) => labels.has(String(l)))) &&
      (!q || (c.title || '').toLocaleLowerCase().includes(q) || (c.phone || '').includes(digitsOnly(q) || '\u0000')),
  );
}
