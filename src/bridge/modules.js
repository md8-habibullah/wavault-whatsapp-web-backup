// Resolves WhatsApp Web's internal modules. WhatsApp renames modules between releases, so every
// lookup goes through candidate lists here and features degrade instead of crashing.

const CANDIDATES = {
  collections: ['WAWebCollections'],
  contactGetters: ['WAWebContactGetters'],
  frontendContactGetters: ['WAWebFrontendContactGetters'],
  apiContact: ['WAWebApiContact'],
  meUser: ['WAWebUserPrefsMeUser'],
  loadMessages: ['WAWebChatLoadMessages'],
  downloadManager: ['WAWebDownloadManager'],
};

const cache = new Map();

export function requireModule(name) {
  try {
    if (typeof window.require !== 'function') return null;
    return window.require(name) ?? null;
  } catch {
    return null;
  }
}

export function mod(key) {
  if (cache.has(key)) return cache.get(key);
  for (const name of CANDIDATES[key] ?? [key]) {
    const m = requireModule(name);
    if (m) {
      cache.set(key, m);
      return m;
    }
  }
  return null;
}

export function collections() {
  return mod('collections');
}

/** Run a getter that may not exist (or may throw) on this WhatsApp version. */
export function safe(fn, fallback = null) {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

export function widToString(wid) {
  if (!wid) return null;
  if (typeof wid === 'string') return wid;
  return wid._serialized ?? safe(() => wid.toString(), null);
}

export function whatsappVersion() {
  return safe(() => window.Debug?.VERSION, null);
}

export function isLoggedIn() {
  const me = mod('meUser');
  return !!safe(() => me.getMaybeMePnUser() || me.getMaybeMeLidUser(), null);
}

export function capabilities() {
  const C = collections();
  const dm = mod('downloadManager')?.downloadManager;
  return {
    contacts: !!C?.Contact,
    chats: !!C?.Chat,
    groups: !!C?.WAWebGroupMetadataCollection,
    labels: !!C?.Label,
    history: typeof mod('loadMessages')?.loadEarlierMsgs === 'function',
    media: typeof dm?.downloadAndMaybeDecrypt === 'function',
    status: !!C?.Status,
    indexedDb: typeof indexedDB !== 'undefined',
  };
}
