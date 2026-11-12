import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import zhCN from './locales/zh-CN.js';

export const LANGUAGE_KEY = 'wv.language';
export const LANGUAGES = ['auto', 'en', 'zh-CN'];
const LanguageContext = createContext(null);
const validLanguage = (value) => LANGUAGES.includes(value) ? value : 'auto';
// WXT auto-imports its cross-browser API for extension builds; previews can supply the same global.
const extensionBrowser = () => typeof browser === 'undefined' ? undefined : browser;

export function resolveLanguage(preference, browserLanguage = 'en') {
  if (preference === 'en' || preference === 'zh-CN') return preference;
  return /^zh(?:$|[-_](?:CN|SG|Hans)(?:[-_]|$))/i.test(browserLanguage) ? 'zh-CN' : 'en';
}

/** English source messages are the fallback. Interpolate values once, never translate user data. */
export function createI18n(language) {
  const chinese = language === 'zh-CN';
  const messages = chinese ? zhCN : {};
  const t = (message, ...values) => {
    const key = Array.isArray(message) ? message.reduce((s, part, i) => s + (i ? `{${i - 1}}` : '') + part, '') : message;
    const translated = Object.hasOwn(messages, key) ? messages[key] : key;
    return typeof translated === 'string' ? translated.replace(/\{(\d+)\}/g, (placeholder, n) => n < values.length ? String(values[n]) : placeholder) : translated;
  };
  const units = { contact: '位联系人', chat: '个会话', message: '条消息', group: '个群组', member: '位成员', 'media file': '个媒体文件', 'phone number': '个号码', 'text status': '条文字动态', update: '条动态', 'member entry': '条成员记录' };
  const plural = (n, one, many = `${one}s`) => `${n.toLocaleString(language)} ${chinese && units[one] ? units[one] : n === 1 ? one : many}`;
  const fmtDate = (timestamp) => timestamp ? new Date(timestamp * 1000).toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return { language, t, plural, fmtDate };
}

/** One preference shared by the dashboard and popup, including already-open extension tabs. */
export function LanguageProvider({ children }) {
  const [preference, setPreference] = useState('auto');
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    const initialRevision = revision.current;
    const changed = (changes, area) => {
      if (area === 'local' && Object.hasOwn(changes, LANGUAGE_KEY)) {
        revision.current++;
        setPreference(validLanguage(changes[LANGUAGE_KEY].newValue));
      }
    };
    const storage = extensionBrowser()?.storage;
    storage?.onChanged?.addListener(changed);
    Promise.resolve(storage?.local?.get(LANGUAGE_KEY))
      .then((saved) => {
        if (active && revision.current === initialRevision) setPreference(validLanguage(saved?.[LANGUAGE_KEY]));
      })
      .catch(() => {});
    return () => {
      active = false;
      storage?.onChanged?.removeListener(changed);
    };
  }, []);
  const setLanguage = useCallback((value) => {
    const next = validLanguage(value);
    revision.current++;
    setPreference(next);
    Promise.resolve(extensionBrowser()?.storage?.local?.set({ [LANGUAGE_KEY]: next })).catch(() => {});
  }, []);
  const browserLanguage = extensionBrowser()?.i18n?.getUILanguage?.() || globalThis.navigator?.language || 'en';
  const language = resolveLanguage(preference, browserLanguage);
  const formatters = useMemo(() => createI18n(language), [language]);
  const current = useRef(formatters);
  current.current = formatters;
  // Existing async jobs and callbacks use the latest language without restarting a read/export.
  const t = useCallback((...args) => current.current.t(...args), []);
  const plural = useCallback((...args) => current.current.plural(...args), []);
  const fmtDate = useCallback((...args) => current.current.fmtDate(...args), []);
  const value = useMemo(() => ({ language, t, plural, fmtDate, preference, setLanguage }), [language, t, plural, fmtDate, preference, setLanguage]);
  return createElement(LanguageContext.Provider, { value }, children);
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n requires LanguageProvider');
  return context;
}
