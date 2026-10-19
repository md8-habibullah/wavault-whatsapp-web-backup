// Reads WhatsApp Web state (page main world). Read-only: nothing here sends messages or changes chats.
import { collections, mod, safe, widToString } from './modules.js';

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'ptt', 'document', 'sticker', 'ptv', 'gif']);

const models = (coll) => safe(() => coll.getModelsArray(), []) ?? [];

function getters() {
  return { G: mod('contactGetters'), F: mod('frontendContactGetters'), A: mod('apiContact') };
}

/** Phone digits for a wid (c.us or lid), or null when WhatsApp hides it. */
function phoneOf(wid, model) {
  if (!wid) return null;
  if (wid.server === 'c.us') return wid.user ?? null;
  if (wid.server !== 'lid') return null;
  const { F, A } = getters();
  const pn = safe(() => model && F.getPhoneNumber(model)) || safe(() => A.getPhoneNumber(wid));
  return pn?.user ?? null;
}

function lidOf(wid) {
  if (!wid) return null;
  if (wid.server === 'lid') return wid.user ?? null;
  const { A } = getters();
  const lid = safe(() => A.getCurrentLid(wid)) || safe(() => A.getLatestLid(wid));
  return lid?.user ?? null;
}

function meInfo() {
  const me = mod('meUser');
  const pn = safe(() => me.getMaybeMePnUser());
  const lid = safe(() => me.getMaybeMeLidUser());
  const C = collections();
  const meContact = safe(() => C.Contact.get(pn)) || safe(() => C.Contact.get(lid));
  return {
    phone: pn?.user ?? null,
    lid: lid?.user ?? null,
    name: safe(() => me.getMaybeMeDisplayName()) || meContact?.pushname || null,
    isBusiness: !!safe(() => meContact.isBusiness),
  };
}

function contactRecord(c, meIds) {
  const { G, F } = getters();
  const id = c.id;
  return {
    id: widToString(id),
    server: id.server,
    phone: phoneOf(id, c),
    lid: lidOf(id),
    name: c.name || null,
    shortName: c.shortName || null,
    pushname: c.pushname || null,
    verifiedName: safe(() => G.getVerifiedName(c)) || c.verifiedName || null,
    username: safe(() => F.getUsername(c)) || c.username || null,
    about: (c.textStatusString || '').trim() || null,
    isMyContact: !!safe(() => F.getIsMyContact(c), c.isAddressBookContact),
    isWAContact: safe(() => G.getIsWAContact(c), true) !== false,
    isBusiness: !!safe(() => G.getIsBusiness(c), c.isBusiness),
    isEnterprise: !!safe(() => G.getIsEnterprise(c), c.isEnterprise),
    isBlocked: !!safe(() => F.getIsContactBlocked(c), false),
    isMe: meIds.has(id.user),
    labels: Array.isArray(c.labels) ? [...c.labels] : [],
    profilePicUrl: safe(() => collections().ProfilePicThumb.get(id)?.eurl) || null,
  };
}

function chatKind(server) {
  if (server === 'g.us') return 'group';
  if (server === 'newsletter') return 'channel';
  if (server === 'broadcast') return 'broadcast';
  if (server === 'c.us' || server === 'lid') return 'user';
  return server || 'other';
}

function chatTitle(chat) {
  const C = collections();
  if (chat.id.server === 'g.us') {
    return safe(() => chat.groupMetadata?.subject) || safe(() => C.WAWebGroupMetadataCollection.get(chat.id)?.subject) || chat.name || null;
  }
  const c = safe(() => C.Contact.get(chat.id));
  return chat.name || c?.name || safe(() => getters().G.getVerifiedName(c)) || c?.pushname || null;
}

function chatRecord(chat) {
  return {
    id: widToString(chat.id),
    server: chat.id.server,
    kind: chatKind(chat.id.server),
    title: chatTitle(chat),
    phone: phoneOf(chat.id, safe(() => collections().Contact.get(chat.id))),
    lid: chat.id.server === 'lid' ? chat.id.user : null,
    unreadCount: Number(chat.unreadCount) || 0,
    lastActivity: Number(chat.t) || null,
    archived: !!chat.archive,
    pinned: !!chat.pin,
    muted: Number(chat.muteExpiration) !== 0 && chat.muteExpiration != null,
    readOnly: !!chat.isReadOnly,
    labels: Array.isArray(chat.labels) ? [...chat.labels] : [],
    loadedMessages: safe(() => chat.msgs.length, 0),
  };
}

function participantRecord(p) {
  const C = collections();
  const contact = safe(() => C.Contact.get(p.id));
  return {
    id: widToString(p.id),
    phone: phoneOf(p.id, contact),
    lid: lidOf(p.id),
    isAdmin: !!p.isAdmin,
    isSuperAdmin: !!p.isSuperAdmin,
  };
}

function groupRecord(meta) {
  const parts = models(meta.participants);
  const me = mod('meUser');
  const meIds = new Set([safe(() => me.getMaybeMePnUser()?.user), safe(() => me.getMaybeMeLidUser()?.user)].filter(Boolean));
  const mine = parts.find((p) => meIds.has(p.id?.user));
  const chat = safe(() => collections().Chat.get(meta.id));
  return {
    id: widToString(meta.id),
    subject: meta.subject || safe(() => chat?.name) || null,
    description: safe(() => meta.desc) || null,
    createdAt: Number(meta.creation) || null,
    owner: phoneOf(meta.owner) || widToString(meta.owner),
    size: Number(meta.size) || parts.length,
    isCommunity: !!meta.isParentGroup,
    announceOnly: !!meta.announce,
    restricted: !!meta.restrict,
    iAmAdmin: !!(mine && (mine.isAdmin || mine.isSuperAdmin)),
    iAmMember: !!mine,
    archived: !!chat?.archive,
    unreadCount: Number(chat?.unreadCount) || 0,
    lastActivity: Number(chat?.t) || null,
    participantsLoaded: parts.length > 0,
    participants: parts.map(participantRecord),
  };
}

// ---------- IndexedDB (address-book contacts that are not on WhatsApp) ----------

function idbGetAll(dbName, store) {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(dbName);
    } catch {
      resolve([]);
      return;
    }
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve([]);
        return;
      }
      const r = db.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => {
        db.close();
        resolve(r.result || []);
      };
      r.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

async function addressBookOnly() {
  const rows = await idbGetAll('model-storage', 'out-contact');
  return rows
    .map((r) => ({
      phone: String(r.id || '').split('@')[0].replace(/\D/g, '') || null,
      name: r.fullName || null,
      shortName: r.firstName || null,
    }))
    .filter((r) => r.phone);
}

/** Contacts straight from IndexedDB, used when the live collections are unavailable. */
async function idbContacts(meIds) {
  const rows = await idbGetAll('model-storage', 'contact');
  return rows
    .filter((r) => /@(lid|s\.whatsapp\.net|c\.us)$/.test(r.id))
    .map((r) => {
      const [user, server] = r.id.split('@');
      const isLid = server === 'lid';
      return {
        id: r.id,
        server: isLid ? 'lid' : 'c.us',
        phone: isLid ? String(r.phoneNumber || '').split('@')[0] || null : user,
        lid: isLid ? user : null,
        name: r.name || null,
        shortName: r.shortName || null,
        pushname: r.pushname || null,
        verifiedName: null,
        username: r.username || null,
        about: (r.textStatusString || '').trim() || null,
        isMyContact: !!r.isAddressBookContact,
        isWAContact: true,
        isBusiness: false,
        isEnterprise: false,
        isBlocked: false,
        isMe: meIds.has(user),
        labels: [],
        profilePicUrl: null,
      };
    });
}

// ---------- public API ----------

export async function getSnapshot() {
  const C = collections();
  const me = meInfo();
  const meIds = new Set([me.phone, me.lid].filter(Boolean));
  const warnings = [];

  let contacts = [];
  if (C?.Contact) {
    contacts = models(C.Contact)
      .filter((c) => c.id && (c.id.server === 'c.us' || c.id.server === 'lid'))
      .map((c) => contactRecord(c, meIds));
  } else {
    warnings.push('Live contact list unavailable on this WhatsApp version; using the offline cache.');
    contacts = await idbContacts(meIds);
  }

  const blocked = models(C?.Blocklist).map((b) => phoneOf(b.id) || widToString(b.id)).filter(Boolean);
  const chats = models(C?.Chat).filter((ch) => ch.id).map(chatRecord);
  const groups = models(C?.WAWebGroupMetadataCollection).filter((g) => g.id).map(groupRecord);
  const labels = models(C?.Label).map((l) => ({
    id: String(l.id),
    name: l.name || `Label ${l.id}`,
    color: l.hexColor || l.color || null,
    count: Number(l.count) || 0,
  }));

  return {
    takenAt: Date.now(),
    me,
    contacts,
    addressBookOnly: await addressBookOnly(),
    chats,
    groups,
    labels,
    blocked,
    warnings,
  };
}

/** Fetch participants for groups whose member list is not loaded yet (same query WhatsApp runs when you open the group info). */
export async function loadGroupParticipants(groupIds, onProgress, isCancelled) {
  const C = collections();
  const out = [];
  let i = 0;
  for (const gid of groupIds) {
    if (isCancelled()) break;
    i += 1;
    const chat = safe(() => C.Chat.get(gid));
    let meta = safe(() => C.WAWebGroupMetadataCollection.get(gid));
    if (!meta || models(meta.participants).length === 0) {
      try {
        meta = await C.WAWebGroupMetadataCollection.find(chat?.id ?? meta?.id ?? gid);
      } catch {
        /* keep what we have */
      }
    }
    if (meta) out.push(groupRecord(meta));
    onProgress({ done: i, total: groupIds.length });
    await sleep(250);
  }
  return out;
}

// ---------- messages ----------

const msgRegistry = new Map(); // serialized msg id -> model, for media downloads

function msgIdString(m) {
  return safe(() => m.id.toString()) || safe(() => m.id._serialized) || `${m.t}-${Math.random()}`;
}

function senderOf(m, chat) {
  const fromMe = !!safe(() => m.id.fromMe);
  if (fromMe) return { fromMe, id: null, phone: null };
  const wid = chat?.id?.server === 'g.us' || m.isStatusV3 || safe(() => m.id.remote?.server) === 'broadcast' ? m.author || m.from : m.from;
  const contact = safe(() => collections().Contact.get(wid));
  return { fromMe, id: widToString(wid), phone: phoneOf(wid, contact) };
}

function mediaInfo(m) {
  const type = m.type === 'video' && m.isGif ? 'gif' : m.type;
  const has = MEDIA_TYPES.has(type) && !!m.directPath && !!m.mediaKey;
  if (!MEDIA_TYPES.has(type)) return null;
  return {
    type,
    mimetype: m.mimetype || null,
    filename: m.filename || null,
    size: Number(m.size) || null,
    duration: Number(m.duration) || null,
    width: Number(m.width) || null,
    height: Number(m.height) || null,
    downloadable: has,
    isViewOnce: !!m.isViewOnce,
  };
}

function thumbnailOf(m) {
  const b = typeof m.body === 'string' ? m.body : '';
  if (MEDIA_TYPES.has(m.type) && /^\/9j\/|^iVBOR/.test(b)) return b; // base64 jpeg/png preview
  const t = safe(() => m.mediaData?.preview?._b64) || safe(() => (typeof m.thumbnail === 'string' ? m.thumbnail : null));
  return t || null;
}

function textOf(m) {
  if (MEDIA_TYPES.has(m.type)) return m.caption || null;
  if (m.type === 'location') return [m.loc, m.lat != null && m.lng != null ? `${m.lat},${m.lng}` : null].filter(Boolean).join(' ') || null;
  if (m.type === 'poll_creation') return m.pollName || null;
  return typeof m.body === 'string' ? m.body : null;
}

export function serializeMsg(m, chat) {
  const id = msgIdString(m);
  const media = mediaInfo(m);
  if (media?.downloadable) msgRegistry.set(id, m);
  const quoted = safe(() => m.quotedMsg);
  return {
    id,
    t: Number(m.t) || null,
    type: m.type,
    subtype: m.subtype || null,
    sender: senderOf(m, chat),
    notifyName: m.notifyName || null,
    text: textOf(m),
    media,
    thumbnail: media ? thumbnailOf(m) : null,
    lat: m.lat ?? null,
    lng: m.lng ?? null,
    pollOptions: Array.isArray(m.pollOptions) ? m.pollOptions.map((o) => o.name) : null,
    vcardName: m.type === 'vcard' ? m.vcardFormattedName || null : null,
    quoted: quoted ? { id: msgIdString(quoted), text: textOf(quoted), type: quoted.type } : m.quotedStanzaID ? { id: m.quotedStanzaID, text: null, type: null } : null,
    isForwarded: !!m.isForwarded,
    starred: !!m.star,
    ack: m.ack ?? null,
    revoked: m.type === 'revoked',
    edited: !!safe(() => m.latestEditMsgKey),
    backgroundColor: m.backgroundColor ?? null,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// WhatsApp 2.3000.105x+ takes loadEarlierMsgs({ chat, msgCollection }); older builds took loadEarlierMsgs(chat).
let loadEarlierStyle = null; // 'object' | 'positional'
async function loadEarlier(loader, chat) {
  const styles = loadEarlierStyle ? [loadEarlierStyle] : ['object', 'positional'];
  let lastError;
  for (const style of styles) {
    try {
      const r = style === 'object' ? await loader.loadEarlierMsgs({ chat, msgCollection: chat.msgs }) : await loader.loadEarlierMsgs(chat);
      loadEarlierStyle = style;
      return r;
    } catch (e) {
      lastError = e;
      if (!(e instanceof TypeError) || loadEarlierStyle) break; // real failure, not a signature mismatch
    }
  }
  throw lastError;
}

/**
 * Loads a chat's history page by page (same call as scrolling up in WhatsApp) until there are no
 * earlier messages, the oldest loaded message is older than `sinceTs`, or `maxMessages` is reached.
 */
export async function loadChatHistory(chatId, { sinceTs = null, maxMessages = null } = {}, onProgress, isCancelled) {
  const C = collections();
  const loader = mod('loadMessages');
  const chat = safe(() => C.Chat.get(chatId));
  if (!chat) throw new Error('Chat not found: ' + chatId);

  const oldest = () => safe(() => Number(chat.msgs.getModelsArray()[0]?.t), null);
  const count = () => safe(() => chat.msgs.length, 0);
  let stalls = 0;
  let complete = false;

  while (!isCancelled()) {
    if (safe(() => chat.msgs.msgLoadState.noEarlierMsgs, false)) {
      complete = true;
      break;
    }
    if (sinceTs && oldest() && oldest() < sinceTs) break;
    if (maxMessages && count() >= maxMessages) break;
    if (!loader?.loadEarlierMsgs) break;
    const before = count();
    try {
      await loadEarlier(loader, chat);
    } catch {
      stalls += 1;
    }
    if (count() === before) stalls += 1;
    else stalls = 0;
    onProgress({ loaded: count(), oldest: oldest() });
    if (stalls >= 4) break; // WhatsApp gave nothing more (older history only on the phone)
    await sleep(150);
  }

  let msgs = models(chat.msgs).slice().sort((a, b) => (a.t || 0) - (b.t || 0));
  if (sinceTs) msgs = msgs.filter((m) => !m.t || m.t >= sinceTs);
  if (maxMessages && msgs.length > maxMessages) msgs = msgs.slice(-maxMessages);
  return { chat: chatRecord(chat), complete, messages: msgs.map((m) => serializeMsg(m, chat)) };
}

// ---------- status ----------

export async function getStatuses() {
  const C = collections();
  if (!C?.Status) return { statuses: [], warnings: ['Status is not available on this WhatsApp version.'] };
  try {
    if (typeof C.Status.sync === 'function' && !safe(() => C.Status.hasSynced?.(), false)) await C.Status.sync();
  } catch {
    /* use what is loaded */
  }
  const statuses = [];
  for (const s of models(C.Status)) {
    const sid = s.id;
    if (!sid || safe(() => sid.server) === 'newsletter') continue;
    const contact = safe(() => C.Contact.get(sid));
    const items = models(s.msgs).map((m) => serializeMsg(m, null));
    if (!items.length) continue;
    statuses.push({
      id: widToString(sid),
      phone: phoneOf(sid, contact),
      isMine: !!safe(() => s.isMyStatus ?? mod('meUser').isMeAccount(sid), false),
      unreadCount: Number(s.unreadCount) || 0,
      lastActivity: Number(s.t) || items[items.length - 1]?.t || null,
      items,
    });
  }
  return { statuses, warnings: [] };
}

// ---------- media ----------

const noopLogger = new Proxy({}, { get: (_, key) => (key === 'then' ? undefined : () => noopLogger) });

export async function downloadMedia(msgId) {
  let m = msgRegistry.get(msgId);
  if (!m) m = safe(() => collections().Msg.get(msgId));
  if (!m) throw new Error('Message is no longer loaded; reload the list and try again.');

  const dm = mod('downloadManager')?.downloadManager;
  let buffer = null;
  let lastError = null;
  if (dm?.downloadAndMaybeDecrypt && m.directPath && m.mediaKey) {
    try {
      buffer = await dm.downloadAndMaybeDecrypt({
        directPath: m.directPath,
        encFilehash: m.encFilehash,
        filehash: m.filehash,
        mediaKey: m.mediaKey,
        mediaKeyTimestamp: m.mediaKeyTimestamp,
        type: m.type,
        mimetype: m.mimetype,
        signal: new AbortController().signal,
        // Newer WhatsApp builds require a performance logger here; any method call on it is a no-op.
        downloadQpl: noopLogger,
      });
    } catch (e) {
      lastError = e;
    }
  }
  if (!buffer) {
    // Fallback: let WhatsApp download it the way the UI does, then read the cached blob.
    try {
      await m.downloadMedia?.({ downloadEvenIfExpensive: true, rmrReason: 1, isUserInitiated: true });
      const blob = safe(() => m.mediaData?.mediaBlob?.forceToBlob?.()) || safe(() => m.mediaData?.mediaBlob?._blob);
      if (blob) buffer = await blob.arrayBuffer();
    } catch (e) {
      lastError = e;
    }
  }
  if (!buffer) throw new Error('Media unavailable (expired on WhatsApp servers or not downloadable)' + (lastError ? ': ' + String(lastError.message || lastError) : ''));
  if (ArrayBuffer.isView(buffer)) buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return { buffer, mimetype: m.mimetype || 'application/octet-stream', filename: m.filename || null, type: m.type };
}
