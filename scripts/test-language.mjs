// Fictional preview only: language persistence, live switching, popup sync and unchanged exports.
// CHROME_PATH=/path/to/chrome node scripts/test-language.mjs
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { strFromU8, unzipSync } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const downloads = resolve(root, 'e2e-output', `language-${Date.now()}`);
mkdirSync(downloads, { recursive: true });
const executablePath = process.env.CHROME_PATH || [
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
const server = await createServer({ configFile: resolve(root, 'preview/vite.config.js'), server: { host: '127.0.0.1', port: 4792, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 15000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith('http://127.0.0.1:4792/') || request.url().startsWith('data:') ? request.continue() : request.abort());
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  const url = 'http://127.0.0.1:4792';
  const $ = selector => `wavault-ui >>> ${selector}`;
  const text = () => page.$eval('wavault-ui', el => el.shadowRoot.textContent);
  const waitText = value => page.waitForFunction(value => document.querySelector('wavault-ui').shadowRoot.textContent.includes(value), {}, value);
  async function click(label, selector = 'button') {
    for (const button of await page.$$($(selector))) {
      if ((await button.evaluate(el => el.textContent.trim())) === label) { await button.click(); return; }
    }
    throw new Error(`Control not found: ${label}`);
  }
  await page.goto(`${url}/#wavault=chats`, { waitUntil: 'networkidle0' });
  await page.waitForSelector($('.wv-tbody .wv-tr'));
  await page.$eval($('.wv-settings > button'), button => button.click());
  const languageSelect = $('.wv-settings select[aria-label]');
  await page.select(languageSelect, 'en');
  await waitText('Follow browser');
  await page.screenshot({ path: resolve(root, 'docs/images/language-settings-en.png') });
  await click('Settings');
  const rows = await page.$$($('.wv-tbody input[type=checkbox]'));
  await rows[0].click(); await rows[1].click();
  const firstTitle = await page.$eval($('.wv-namecell-text strong'), el => el.textContent);
  await click('Settings');
  await page.select(languageSelect, 'zh-CN');
  await waitText('跟随浏览器');
  assert.match(await text(), /已选择 2 项/);
  assert.equal(await page.$eval($('.wv-namecell-text strong'), el => el.textContent), firstTitle);
  await page.screenshot({ path: resolve(root, 'docs/images/language-settings-zh-CN.png') });
  console.log('Dashboard: language switch and selection preserved.');

  const popup = await browser.newPage();
  popup.setDefaultTimeout(15000);
  popup.on('pageerror', e => errors.push(e.message));
  await popup.goto(`${url}/popup.html`, { waitUntil: 'domcontentloaded' });
  await popup.waitForFunction(() => document.querySelector('main')?.lang === 'zh-CN');
  assert.match(await popup.$eval('main', el => el.textContent), /批量导出聊天记录/);
  await page.bringToFront();
  await page.select(languageSelect, 'en');
  await popup.waitForFunction(() => document.querySelector('main')?.lang === 'en', { polling: 100 });
  assert.match(await text(), /2 selected/);
  console.log('Popup: saved language and cross-page updates preserved.');
  await page.select(languageSelect, 'zh-CN');
  await click('设置');

  const fields = await page.$$($('.wv-options fieldset'));
  for (const label of await fields[0].$$('label')) {
    const desired = /纯文本 TXT|JSON/.test(await label.evaluate(el => el.textContent));
    const input = await label.$('input');
    if (await input.evaluate(el => el.checked) !== desired) await input.click();
  }
  for (const input of await fields[1].$$('input')) if (await input.evaluate(el => el.checked)) await input.click();
  await click('批量导出 2 个会话');
  // Switch language while the original export is in flight: no restart or lost selection.
  await page.evaluate(async () => browser.storage.local.set({ 'wv.language': 'en' }));
  await waitText('Backup finished');
  for (let i = 0; i < 50 && !readdirSync(downloads).some(file => file.endsWith('.zip')); i++) await new Promise(resolve => setTimeout(resolve, 100));
  const archive = readdirSync(downloads).find(file => file.endsWith('.zip'));
  assert.ok(archive);
  const files = unzipSync(readFileSync(resolve(downloads, archive)));
  const txt = Object.keys(files).filter(file => file.endsWith('/chat.txt'));
  assert.equal(txt.length, 2);
  assert.equal(Object.keys(files).filter(file => file.endsWith('/chat.json')).length, 2);
  for (const name of txt) {
    assert.match(strFromU8(files[name]), /Sure, around 10am works\./);
    assert.match(strFromU8(files[name]), /আসসালামু আলাইকুম/);
  }
  await click('Done');
  await click('Settings');
  await page.select(languageSelect, 'zh-CN');
  await page.goto(`${url}/#wavault=contacts`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('wavault-ui').shadowRoot.querySelector('h2')?.textContent === '联系人名单');
  await page.waitForSelector($('.wv-tbody .wv-tr'));
  const contactName = await page.$eval($('.wv-namecell-text strong'), el => el.textContent);
  assert.match(contactName, /[A-Za-z]/);
  await page.select($('.wv-dock .wv-select select'), 'csv');
  await (await page.$($('.wv-dock .wv-btn-primary'))).click();
  for (let i = 0; i < 50 && !readdirSync(downloads).some(file => file.endsWith('.csv')); i++) await new Promise(resolve => setTimeout(resolve, 100));
  const csv = readdirSync(downloads).find(file => file.endsWith('.csv'));
  assert.ok(csv, `CSV export missing. Preview: ${(await text()).slice(-800)}; files: ${readdirSync(downloads).join(', ')}`);
  const content = readFileSync(resolve(downloads, csv), 'utf8');
  assert.match(content.split('\n')[0], /Display name,Saved name,Phone/);
  assert.ok(content.includes(contactName));
  await page.$$eval($('.wv-tabs button'), buttons => buttons[1].click());
  await waitText('加载成员名单');
  await page.$$eval($('.wv-tabs button'), buttons => buttons[3].click());
  await page.waitForSelector($('.wv-status-group'));
  assert.match(await text(), /保存全部/);
  assert.deepEqual(errors, []);
  console.log('Language preview passed: EN ↔ 简体中文, persistence, popup live sync, selection and in-flight job preserved, original CSV/TXT/JSON data, four tabs.');
} finally {
  await browser?.close();
  await server.close();
}
