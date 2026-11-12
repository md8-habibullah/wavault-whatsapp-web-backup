import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createI18n, LANGUAGE_KEY, LanguageProvider, resolveLanguage, useI18n } from '../src/ui/i18n.js';
import zhCN from '../src/ui/locales/zh-CN.js';

describe('UI messages', () => {
  it.each(['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN'])('follows Simplified Chinese browser locale %s', (locale) => {
    expect(resolveLanguage('auto', locale)).toBe('zh-CN');
  });
  it.each(['en-US', 'zh-TW', 'zh-Hant', 'ar', 'fr'])('falls back to English for %s', (locale) => {
    expect(resolveLanguage('auto', locale)).toBe('en');
  });
  it('honors explicit choices and safely handles an unknown stored value', () => {
    expect(resolveLanguage('en', 'zh-CN')).toBe('en');
    expect(resolveLanguage('zh-CN', 'en-US')).toBe('zh-CN');
    expect(resolveLanguage('unknown', 'en-US')).toBe('en');
  });
  it('keeps English source messages and falls back for missing translations', () => {
    expect(createI18n('en').t('Settings')).toBe('Settings');
    expect(createI18n('zh-CN').t('Settings')).toBe('设置');
    expect(createI18n('zh-CN').t('Not translated yet')).toBe('Not translated yet');
  });
  it('interpolates values once without translating customer text or interpreting placeholder-like data', () => {
    const { t } = createI18n('zh-CN');
    expect(t`Saved ${'Contacts-{0}.txt'}`).toBe('已保存 Contacts-{0}.txt');
    expect(t`Search ${'Saved <script>客户</script>'}`).toBe('搜索Saved <script>客户</script>');
    expect(createI18n('en').t`Saved ${'Contacts-{0}.txt'}`).toBe('Saved Contacts-{0}.txt');
  });
  it('preserves every interpolation slot in the translated catalog', () => {
    const slots = (s) => [...s.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();
    for (const [source, translated] of Object.entries(zhCN)) expect(slots(translated), source).toEqual(slots(source));
  });
  it('uses locale-aware units without changing the English plural behavior', () => {
    expect(createI18n('en').plural(1, 'chat')).toBe('1 chat');
    expect(createI18n('en').plural(2, 'member entry', 'member entries')).toBe('2 member entries');
    expect(createI18n('zh-CN').plural(2, 'chat')).toBe('2 个会话');
    expect(createI18n('zh-CN').fmtDate(0)).toBe('');
  });
});

describe('language preference', () => {
  const mounted = [];
  let saved;
  let listeners;
  let pendingRead;
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    saved = {};
    listeners = new Set();
    pendingRead = null;
    globalThis.browser = {
      i18n: { getUILanguage: () => 'en-US' },
      storage: {
        onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) },
        local: {
          get: async () => pendingRead ? await pendingRead : { ...saved },
          set: async (values) => {
            const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { oldValue: saved[key], newValue }]));
            Object.assign(saved, values);
            for (const fn of listeners) fn(changes, 'local');
          },
        },
      },
    };
  });
  afterEach(async () => {
    await act(async () => { for (const { root, host } of mounted.splice(0)) { root.unmount(); host.remove(); } });
    delete globalThis.browser;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
  async function mount() {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const entry = { root, host, current: null };
    function Probe() {
      const context = useI18n();
      entry.current = context;
      return createElement('span', { lang: context.language }, context.t('Settings'));
    }
    mounted.push(entry);
    await act(async () => root.render(createElement(LanguageProvider, null, createElement(Probe))));
    return entry;
  }
  it('loads a stored choice, persists changes and restores it in a new view', async () => {
    saved[LANGUAGE_KEY] = 'zh-CN';
    const first = await mount();
    expect(first.host.textContent).toBe('设置');
    await act(async () => first.current.setLanguage('en'));
    expect(saved[LANGUAGE_KEY]).toBe('en');
    expect((await mount()).host.textContent).toBe('Settings');
  });
  it('synchronizes existing views and handles preference removal', async () => {
    const first = await mount();
    const second = await mount();
    await act(async () => first.current.setLanguage('zh-CN'));
    expect(second.host.textContent).toBe('设置');
    await act(async () => { for (const fn of listeners) fn({ [LANGUAGE_KEY]: {} }, 'local'); });
    expect(first.current.preference).toBe('auto');
    expect(second.host.textContent).toBe('Settings');
  });
  it('ignores unrelated storage events and cleans up listeners', async () => {
    const first = await mount();
    await act(async () => { for (const fn of listeners) fn({ [LANGUAGE_KEY]: { newValue: 'zh-CN' } }, 'sync'); });
    expect(first.host.textContent).toBe('Settings');
    await act(async () => { first.root.unmount(); });
    expect(listeners.size).toBe(0);
  });
  it('does not let a slow initial read overwrite a newer user choice', async () => {
    let complete;
    pendingRead = new Promise(resolve => { complete = resolve; });
    const first = await mount();
    await act(async () => first.current.setLanguage('zh-CN'));
    await act(async () => complete({ [LANGUAGE_KEY]: 'en' }));
    expect(first.host.textContent).toBe('设置');
  });
  it('retains formatter callbacks for in-flight jobs while switching language', async () => {
    const first = await mount();
    const originalT = first.current.t;
    await act(async () => first.current.setLanguage('zh-CN'));
    expect(first.current.t).toBe(originalT);
    expect(originalT('Settings')).toBe('设置');
  });
  it('works in memory if extension storage is unavailable', async () => {
    delete globalThis.browser.storage;
    const first = await mount();
    await act(async () => first.current.setLanguage('zh-CN'));
    expect(first.host.textContent).toBe('设置');
  });
});
