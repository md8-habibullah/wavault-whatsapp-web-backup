// End-to-end driver for the browser started by scripts/e2e-browser.mjs.
// Usage: node scripts/e2e.mjs <command> [args]
//   state                      WhatsApp login state + whether WAVault injected
//   shot <name>                screenshot to e2e-output/<name>.png
//   open [view]                open the dashboard (contacts|groups|chats|status)
//   preset <label>             click a contact/chat list preset by its label
//   search <text>              type into the dashboard search box
//   format <id>                choose an export format in the dock
//   click <text>               click a dashboard button by its visible text
//   export-all                 export contacts in every format and verify the files
//   wait-download <ms>         wait for downloads to settle and list them
//   text                       print the dashboard's visible text (headings, counts, toasts)
import puppeteer from 'puppeteer-core';
import { mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'e2e-output');
const downloads = resolve(out, 'downloads');
mkdirSync(downloads, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
const pages = await browser.pages();
const page = pages.find((p) => p.url().startsWith('https://web.whatsapp.com')) || pages[0];
const cdp = await browser.target().createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });

const $ = (sel) => page.$(`wavault-ui >>> ${sel}`);
const $$ = (sel) => page.$$(`wavault-ui >>> ${sel}`);

async function clickText(text, sel = 'button') {
  for (const el of await $$(sel)) {
    const t = (await el.evaluate((e) => e.textContent)).trim();
    if (t === text || t.startsWith(text)) {
      await el.click();
      return true;
    }
  }
  throw new Error(`No ${sel} with text "${text}"`);
}

async function dashboardText() {
  const host = await page.$('wavault-ui');
  if (!host) return '(WAVault not injected)';
  return host.evaluate((h) => {
    const r = h.shadowRoot;
    const pick = (s) => [...r.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return JSON.stringify({ title: pick('.wv-title'), tabs: pick('.wv-tabs button'), presets: pick('.wv-presets button'), dock: pick('.wv-dock'), toasts: pick('.wv-toast'), modal: pick('.wv-modal'), waiting: pick('.wv-waiting'), note: pick('.wv-note'), rows: r.querySelectorAll('.wv-tbody .wv-tr').length }, null, 1);
  });
}

function listDownloads() {
  return readdirSync(downloads).map((f) => `${f}  ${statSync(resolve(downloads, f)).size} bytes`);
}

async function waitDownloads(ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!readdirSync(downloads).some((f) => f.endsWith('.crdownload'))) break;
    await sleep(250);
  }
  await sleep(500);
}

const [cmd, ...args] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'state': {
      const s = await page.evaluate(() => ({
        url: location.href,
        qr: !!document.querySelector('canvas[aria-label], [data-ref]') || document.body.innerText.includes('Scan to log in'),
        chats: document.body.innerText.includes('Search or start a new chat') || !!document.querySelector('#pane-side'),
        loading: document.body.innerText.includes('Loading your chats'),
        wavault: !!document.querySelector('wavault-ui'),
        bridge: !!window.__wavaultBridge,
      }));
      console.log(JSON.stringify(s));
      break;
    }
    case 'shot': {
      const p = resolve(out, `${args[0] || 'shot'}.png`);
      await page.screenshot({ path: p });
      console.log(p);
      break;
    }
    case 'open': {
      if (!(await $('.wv-overlay'))) {
        const btn = await $('.wv-launcher');
        if (!btn) throw new Error('Launcher button not found');
        await btn.click();
      }
      await page.waitForSelector('wavault-ui >>> .wv-overlay', { timeout: 10000 });
      if (args[0]) await clickText({ contacts: 'Contacts', groups: 'Groups', chats: 'Chats', status: 'Status' }[args[0]], '.wv-tabs button');
      await page.waitForSelector('wavault-ui >>> .wv-view', { timeout: 60000 });
      await sleep(800);
      console.log(await dashboardText());
      break;
    }
    case 'preset':
      await clickText(args.join(' '), '.wv-presets button');
      await sleep(400);
      console.log(await dashboardText());
      break;
    case 'search': {
      const input = await $('.wv-search');
      await input.click({ clickCount: 3 });
      await input.type(args.join(' '));
      await sleep(600);
      console.log(await dashboardText());
      break;
    }
    case 'format': {
      const sel = await $('.wv-select select');
      await sel.select(args[0]);
      console.log('format', args[0]);
      break;
    }
    case 'click':
      await clickText(args.join(' '));
      await sleep(800);
      console.log(await dashboardText());
      break;
    case 'export-all': {
      for (const f of readdirSync(downloads)) rmSync(resolve(downloads, f));
      const formats = ['csv', 'xlsx', 'json', 'vcf3', 'vcf4', 'google', 'outlook', 'txt', 'html'];
      for (const id of formats) {
        await (await $('.wv-select select')).select(id);
        await sleep(150);
        await clickText('Export', '.wv-dock-actions button');
        await waitDownloads();
      }
      console.log(listDownloads().join('\n'));
      console.log(await dashboardText());
      break;
    }
    case 'wait-download':
      await waitDownloads(Number(args[0]) || 5000);
      console.log(listDownloads().join('\n'));
      break;
    case 'text':
      console.log(await dashboardText());
      break;
    default:
      console.log('Unknown command. See the header of scripts/e2e.mjs');
  }
} finally {
  await browser.disconnect();
}
