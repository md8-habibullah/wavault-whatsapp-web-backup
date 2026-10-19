// Opens the dashboard in the WhatsApp Web tab and hands printable reports to the report page.
const WA_URL = 'https://web.whatsapp.com/';
const reports = new Map();

async function findWhatsAppTab() {
  const tabs = await browser.tabs.query({ url: 'https://web.whatsapp.com/*' });
  return tabs.find((t) => t.active) || tabs[0] || null;
}

async function openDashboard(view) {
  const tab = await findWhatsAppTab();
  if (!tab) {
    await browser.tabs.create({ url: `${WA_URL}#wavault${view ? `=${view}` : ''}` });
    return { opened: 'new-tab' };
  }
  await browser.tabs.update(tab.id, { active: true });
  if (tab.windowId != null) await browser.windows.update(tab.windowId, { focused: true }).catch(() => {});
  try {
    await browser.tabs.sendMessage(tab.id, { type: 'wavault:open', view });
  } catch {
    // Content script not there yet (tab opened before install): reload once so it injects.
    await browser.tabs.update(tab.id, { url: `${WA_URL}#wavault${view ? `=${view}` : ''}` });
  }
  return { opened: 'existing-tab' };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === 'wavault:open-dashboard') return openDashboard(msg.view);
    if (msg?.type === 'wavault:print-report') {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      reports.set(id, msg.table);
      setTimeout(() => reports.delete(id), 5 * 60_000);
      return browser.tabs.create({ url: browser.runtime.getURL(`/report.html#${id}`), index: sender.tab ? sender.tab.index + 1 : undefined }).then(() => ({ id }));
    }
    if (msg?.type === 'wavault:get-report') {
      const table = reports.get(msg.id) || null;
      reports.delete(msg.id);
      return Promise.resolve(table);
    }
    return undefined;
  });
});
