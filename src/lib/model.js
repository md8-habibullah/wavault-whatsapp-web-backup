// Turns a bridge snapshot into one de-duplicated contact list with category flags.

export const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');
export const toE164 = (digits) => (digits ? `+${digitsOnly(digits)}` : '');

const pick = (...vals) => vals.find((v) => v !== null && v !== undefined && v !== '') ?? null;

function emptyContact(key) {
  return {
    key,
    phone: null,
    lid: null,
    name: null,
    shortName: null,
    pushname: null,
    businessName: null,
    username: null,
    about: null,
    isSaved: false,
    onWhatsApp: null, // true | false | null (unknown)
    isBusiness: false,
    isEnterprise: false,
    isBlocked: false,
    isMe: false,
    hasChat: false,
    unreadCount: 0,
    lastChatAt: null,
    archived: false,
    pinned: false,
    labels: [],
    groups: [],
    adminIn: [],
    sources: [],
    profilePicUrl: null,
  };
}

const addUnique = (arr, v) => {
  if (v && !arr.includes(v)) arr.push(v);
};

export function buildContacts(snapshot) {
  const byKey = new Map();
  const lidToKey = new Map();
  const labelName = new Map((snapshot.labels || []).map((l) => [String(l.id), l.name]));

  const keyFor = (phone, lid) => {
    const p = digitsOnly(phone);
    if (p) return p;
    if (lid && lidToKey.has(String(lid))) return lidToKey.get(String(lid));
    return lid ? `lid:${lid}` : null;
  };

  const upsert = (phone, lid) => {
    const key = keyFor(phone, lid);
    if (!key) return null;
    let c = byKey.get(key);
    if (!c) {
      c = emptyContact(key);
      byKey.set(key, c);
    }
    if (phone && !c.phone) c.phone = digitsOnly(phone);
    if (lid && !c.lid) c.lid = String(lid);
    if (lid) lidToKey.set(String(lid), key);
    return c;
  };

  // Pass 1: register every LID -> phone pair so later LID-only references merge correctly.
  for (const r of snapshot.contacts || []) {
    if (r.lid && r.phone) lidToKey.set(String(r.lid), digitsOnly(r.phone));
  }

  for (const r of snapshot.contacts || []) {
    const c = upsert(r.phone, r.lid);
    if (!c) continue;
    c.name = pick(c.name, r.name);
    c.shortName = pick(c.shortName, r.shortName);
    c.pushname = pick(c.pushname, r.pushname);
    c.businessName = pick(c.businessName, r.verifiedName);
    c.username = pick(c.username, r.username);
    c.about = pick(c.about, r.about);
    c.isSaved = c.isSaved || !!r.isMyContact;
    if (r.isWAContact !== false) c.onWhatsApp = true;
    else if (c.onWhatsApp === null) c.onWhatsApp = false;
    c.isBusiness = c.isBusiness || !!r.isBusiness || !!r.verifiedName;
    c.isEnterprise = c.isEnterprise || !!r.isEnterprise;
    c.isBlocked = c.isBlocked || !!r.isBlocked;
    c.isMe = c.isMe || !!r.isMe;
    c.profilePicUrl = pick(c.profilePicUrl, r.profilePicUrl);
    for (const l of r.labels || []) addUnique(c.labels, labelName.get(String(l)) || String(l));
    addUnique(c.sources, 'contacts');
  }

  for (const r of snapshot.addressBookOnly || []) {
    const c = upsert(r.phone, null);
    if (!c) continue;
    c.name = pick(c.name, r.name);
    c.shortName = pick(c.shortName, r.shortName);
    c.isSaved = true;
    if (c.onWhatsApp !== true) c.onWhatsApp = false;
    addUnique(c.sources, 'address book');
  }

  for (const ch of snapshot.chats || []) {
    if (ch.kind !== 'user') continue;
    const c = upsert(ch.phone, ch.lid);
    if (!c) continue;
    c.hasChat = true;
    c.onWhatsApp = true;
    // unreadCount -1 means "marked as unread" in WhatsApp
    c.unreadCount = ch.unreadCount < 0 ? Math.max(c.unreadCount, 1) : Math.max(c.unreadCount, ch.unreadCount);
    c.lastChatAt = Math.max(c.lastChatAt || 0, ch.lastActivity || 0) || null;
    c.archived = c.archived || ch.archived;
    c.pinned = c.pinned || ch.pinned;
    if (!c.name && !c.pushname && ch.title && digitsOnly(ch.title) !== c.phone) c.pushname = ch.title;
    for (const l of ch.labels || []) addUnique(c.labels, labelName.get(String(l)) || String(l));
    addUnique(c.sources, 'chats');
  }

  for (const g of snapshot.groups || []) {
    for (const p of g.participants || []) {
      const c = upsert(p.phone, p.lid);
      if (!c) continue;
      c.onWhatsApp = true;
      addUnique(c.groups, g.subject || g.id);
      if (p.isAdmin || p.isSuperAdmin) addUnique(c.adminIn, g.subject || g.id);
      addUnique(c.sources, 'groups');
    }
  }

  const blocked = new Set((snapshot.blocked || []).map((b) => digitsOnly(String(b).split('@')[0])));
  for (const c of byKey.values()) {
    if (c.phone && blocked.has(c.phone)) c.isBlocked = true;
  }

  const list = [...byKey.values()];
  for (const c of list) c.displayName = displayNameOf(c);
  list.sort((a, b) => sortName(a).localeCompare(sortName(b)) || String(a.key).localeCompare(String(b.key)));
  return list;
}

export function displayNameOf(c) {
  return pick(c.name, c.businessName, c.pushname, c.username ? `@${c.username}` : null, c.phone ? toE164(c.phone) : null, c.lid ? `LID ${c.lid}` : null) || 'Unknown';
}

const sortName = (c) => {
  const n = c.name || c.businessName || c.pushname || '';
  return (n ? '0' : '1') + n.toLocaleLowerCase();
};

/** Lookup map by key, phone digits and `lid:<lid>`. */
export function indexContacts(list) {
  const idx = new Map();
  for (const c of list) {
    idx.set(c.key, c);
    if (c.phone) idx.set(c.phone, c);
    if (c.lid) idx.set(`lid:${c.lid}`, c);
  }
  return idx;
}

export function groupMembers(group, index) {
  return (group.participants || []).map((p) => {
    const phone = digitsOnly(p.phone);
    const key = phone || (p.lid ? `lid:${p.lid}` : null);
    const c = (phone && index.get(phone)) || (p.lid && index.get(`lid:${p.lid}`)) || null;
    return {
      ...(c || { ...emptyContact(key), phone: digitsOnly(p.phone) || null, lid: p.lid || null, onWhatsApp: true }),
      displayName: c ? c.displayName : displayNameOf({ phone: digitsOnly(p.phone), lid: p.lid }),
      group: group.subject || group.id,
      role: p.isSuperAdmin ? 'Owner' : p.isAdmin ? 'Admin' : 'Member',
    };
  });
}
