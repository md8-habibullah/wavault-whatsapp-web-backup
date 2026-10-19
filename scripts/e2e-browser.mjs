// Starts Chromium with the built extension loaded and a persistent test profile, then stays running.
// Other scripts (scripts/e2e.mjs) attach to it on http://127.0.0.1:9333.
//   npm run build && node scripts/e2e-browser.mjs [path-to-chromium]
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ext = resolve(root, '.output/chrome-mv3');
const profile = resolve(root, '.e2e-profile');
const executablePath = process.argv[2] || process.env.CHROME_PATH || '/usr/bin/chromium';

if (!existsSync(resolve(ext, 'manifest.json'))) {
  console.error('Build first: npm run build');
  process.exit(1);
}
mkdirSync(profile, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: false,
  userDataDir: profile,
  defaultViewport: null,
  pipe: true,
  enableExtensions: [ext],
  args: ['--remote-debugging-port=9333', '--window-size=1400,900', '--no-first-run', '--no-default-browser-check'],
});

const [page] = await browser.pages();
await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
console.log('E2E browser ready on http://127.0.0.1:9333 with extension', ext);
browser.on('disconnected', () => process.exit(0));
