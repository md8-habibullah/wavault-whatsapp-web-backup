import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '../shared/rpc-client.js';
import { buildContacts, indexContacts } from '../lib/model.js';

/** Polls the bridge until WhatsApp is loaded and logged in. */
export function useWhatsAppStatus(active) {
  const [status, setStatus] = useState({ state: 'connecting' });
  useEffect(() => {
    let stop = false;
    let timer;
    const tick = async () => {
      try {
        const s = await invoke('status', {}, { timeoutMs: 4000 });
        if (stop) return;
        setStatus({ state: s.loggedIn && s.loaded ? 'ready' : s.loaded ? 'logged-out' : 'loading', ...s });
        timer = setTimeout(tick, s.loggedIn && s.loaded ? 15000 : 2000);
      } catch {
        if (stop) return;
        setStatus({ state: 'connecting' });
        timer = setTimeout(tick, 2000);
      }
    };
    if (active) tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [active]);
  return status;
}

/** Loads the WhatsApp snapshot and derives the merged contact list. */
export function useSnapshot(ready) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await invoke('snapshot', {}, { timeoutMs: 120000 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && !snapshot && !loading) refresh();
  }, [ready, snapshot, loading, refresh]);

  const contacts = useMemo(() => (snapshot ? buildContacts(snapshot) : []), [snapshot]);
  const index = useMemo(() => indexContacts(contacts), [contacts]);

  /** Replace some groups (after loading their member lists). */
  const mergeGroups = useCallback((groups) => {
    setSnapshot((s) => {
      if (!s) return s;
      const byId = new Map(groups.map((g) => [g.id, g]));
      const merged = s.groups.map((g) => byId.get(g.id) || g);
      for (const g of groups) if (!s.groups.some((x) => x.id === g.id)) merged.push(g);
      return { ...s, groups: merged };
    });
  }, []);

  return { snapshot, contacts, index, error, loading, refresh, mergeGroups };
}

/** Preference persisted in extension storage (falls back to memory). */
export function usePref(key, initial) {
  const [value, setValue] = useState(initial);
  const loaded = useRef(false);
  useEffect(() => {
    browser.storage?.local
      .get(key)
      .then((r) => {
        if (r && r[key] !== undefined) setValue(r[key]);
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, [key]);
  const update = useCallback(
    (v) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? v(prev) : v;
        browser.storage?.local.set({ [key]: next }).catch(() => {});
        return next;
      });
    },
    [key],
  );
  return [value, update];
}

/** Display name for a message sender / status owner. */
export function makeNameOf(index, me) {
  return (sender, msg) => {
    if (sender?.fromMe) return me?.name || 'You';
    const phone = sender?.phone;
    const lid = String(sender?.id || '').endsWith('@lid') ? sender.id.split('@')[0] : null;
    const c = (phone && index.get(phone)) || (lid && index.get(`lid:${lid}`));
    if (c && c.displayName && !c.displayName.startsWith('LID ')) return c.displayName;
    if (msg?.notifyName) return msg.notifyName;
    if (phone) return `+${phone}`;
    return c?.displayName || 'Unknown';
  };
}

export function useSelection() {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = useCallback((key) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);
  const setMany = useCallback((keys, on) => {
    setSelected((s) => {
      const n = new Set(s);
      for (const k of keys) {
        if (on) n.add(k);
        else n.delete(k);
      }
      return n;
    });
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, toggle, setMany, clear };
}
