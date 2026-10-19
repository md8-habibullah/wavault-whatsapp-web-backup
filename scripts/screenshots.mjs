// Regenerates the README/docs screenshots and the demo GIF from the demo preview (fictional data only).
// Usage: npm run screenshots   (uses a running `npm run preview` on :4789, or starts one)
// Needs Chromium/Chrome (set CHROME_PATH if it is not found) and ffmpeg for the GIF.
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unzipSync } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'docs/images');
const work = mkdtempSync(join(tmpdir(), 'wavault-shots-'));
const frames = join(work, 'frames');
const downloads = join(work, 'downloads');
mkdirSync(out, { recursive: true });
mkdirSync(frames);
mkdirSync(downloads);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_BASE = 'http://127.0.0.1:4789/';

let server = null;
if (!(await fetch(URL_BASE).then((r) => r.ok, () => false))) {
  const { createServer } = await import('vite');
  server = await createServer({ configFile: resolve(root, 'preview/vite.config.js') });
  await server.listen();
}

const executablePath = process.env.CHROME_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage();
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });

const $$ = (sel) => page.$$(`wavault-ui >>> ${sel}`);
async function click(text, sel = 'button') {
  for (const el of await $$(sel)) {
    const t = (await el.evaluate((e) => e.textContent)).replace(/\s+/g, ' ').trim();
    if (t === text || t.startsWith(text)) {
      await el.click();
      await sleep(350);
      return;
    }
  }
  throw new Error(`No ${sel} with text "${text}"`);
}
async function selectRows(n) {
  const boxes = await $$('.wv-tbody input[type=checkbox]');
  for (const b of boxes.slice(0, n)) await b.click();
  await sleep(200);
}

let frameNo = 0;
async function frame(holdMs = 1600) {
  // One GIF frame per 100 ms of hold time keeps ffmpeg's concat simple.
  const file = join(frames, `f${String(frameNo++).padStart(3, '0')}.png`);
  await page.screenshot({ path: file });
  writeFileSync(join(frames, 'list.txt'), '', { flag: 'a' });
  writeFileSync(join(frames, 'list.txt'), `file '${file}'\nduration ${holdMs / 1000}\n`, { flag: 'a' });
}
const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });

async function open(view, { theme = 'light', width = 1440, height = 900 } = {}) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(URL_BASE, { waitUntil: 'networkidle0' });
  await page.evaluate((t) => {
    localStorage.clear();
    localStorage.setItem('wv-demo:wv.theme', JSON.stringify(t));
  }, theme);
  await page.goto(`${URL_BASE}#wavault=${view}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('wavault-ui >>> .wv-tbody .wv-tr, wavault-ui >>> .wv-status-group', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(500);
}

// Contacts
await open('contacts');
await shot('contacts');
await frame(2200);
await click('Unsaved');
await frame(1400);
await click('Business');
await click('Refine');
await selectRows(4);
await shot('contacts-filters');
await frame(2200);

// Search by number in any format
await click('All contacts');
await click('Refine');
const search = (await $$('input[type=search]'))[0];
await search.type('+44 7700 900 01', { delay: 40 });
await sleep(400);
await shot('contacts-search');
await frame(1600);

// Groups and member lists
await click('Groups', '.wv-tabs button');
await sleep(300);
await click('Load member lists');
for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelector('wavault-ui').shadowRoot.textContent.includes('Loaded member lists'))); i++) await sleep(250);
await click('Done', '.wv-modal button');
await selectRows(2);
await shot('groups');
await frame(2000);

// Chat backup: three chats with media, then the finished summary
await click('Chats', '.wv-tabs button');
await sleep(300);
await selectRows(3);
await shot('chat-backup');
await frame(1800);
await click('Back up 3 chats');
await sleep(700);
await frame(1200);
await page.waitForSelector('wavault-ui >>> .wv-job', { timeout: 10000 }).catch(() => {});
for (let i = 0; i < 120 && !(await page.evaluate(() => document.querySelector('wavault-ui').shadowRoot.textContent.includes('Backup finished'))); i++) await sleep(250);
await sleep(400);
await shot('chat-backup-done');
await frame(2200);

// Status
await click('Close', '.wv-job button').catch(() => {});
await click('Status', '.wv-tabs button');
await sleep(1500);
const thumbs = await $$('.wv-status-thumb');
for (const t of thumbs.slice(0, 5)) await t.click();
await sleep(300);
await shot('status');
await frame(2200);

// Dark theme
await open('contacts', { theme: 'dark' });
await shot('contacts-dark');
await frame(2200);

// Phone-width layout
await open('contacts', { width: 420, height: 860 });
await shot('mobile');

// The HTML chat viewer from the backup ZIP
for (let i = 0; i < 40 && !readdirSync(downloads).some((f) => f.endsWith('.zip')); i++) await sleep(250);
const zipName = readdirSync(downloads).find((f) => f.endsWith('.zip'));
if (zipName) {
  const { readFileSync } = await import('node:fs');
  const files = unzipSync(new Uint8Array(readFileSync(join(downloads, zipName))));
  const site = join(work, 'site');
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('/')) continue;
    mkdirSync(join(site, name, '..'), { recursive: true });
    writeFileSync(join(site, name), data);
  }
  const withMedia = Object.keys(files).filter((n) => n.endsWith('/chat.html')).sort((a, b) => files[b].length - files[a].length)[0];
  await page.setViewport({ width: 1100, height: 820, deviceScaleFactor: 1 });
  await page.goto(`file://${join(site, withMedia)}`, { waitUntil: 'load' });
  await page.evaluate(() => {
    const photo = document.querySelector('.media img');
    if (photo) photo.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, document.body.scrollHeight);
  });
  await sleep(600);
  await shot('chat-viewer');
  await page.goto(`file://${join(site, 'index.html')}`, { waitUntil: 'load' });
  await shot('backup-index');
} else {
  console.warn('No backup ZIP was downloaded; skipped chat-viewer.png');
}

await browser.close();
if (server) await server.close();

// Demo GIF (960 px wide, palette-optimised)
try {
  const gif = join(out, 'demo.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'), '-vf', 'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', gif]);
  console.log('demo.gif written');
} catch (e) {
  console.warn('ffmpeg not available or failed; skipped demo.gif', e.message);
}
rmSync(work, { recursive: true, force: true });
execFileSync(process.execPath, [resolve(root, 'scripts/render-og.mjs')], { stdio: 'inherit' });
console.log('Screenshots in', out, readdirSync(out).join(', '));
