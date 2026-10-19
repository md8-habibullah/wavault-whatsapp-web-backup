// Assembles the GitHub Pages site into .site/: site/ + docs/images + fonts + icons, plus sitemap and robots.
// Usage: node scripts/build-site.mjs   (no dependencies; the Pages workflow runs it)
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '.site');
const SITE_URL = 'https://md8-habibullah.github.io/wavault-whatsapp-web-backup/';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(resolve(root, 'site'), out, { recursive: true, filter: (src) => !src.endsWith('og.html') });
cpSync(resolve(root, 'docs/images'), resolve(out, 'images'), { recursive: true });
cpSync(resolve(root, 'public/fonts'), resolve(out, 'fonts'), { recursive: true });
cpSync(resolve(root, 'assets/icon.svg'), resolve(out, 'icon.svg'));
cpSync(resolve(root, 'public/icon/128.png'), resolve(out, 'icon-128.png'));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod></url>
</urlset>
`);
writeFileSync(resolve(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
writeFileSync(resolve(out, '.nojekyll'), '');
console.log('Site built in', out);
