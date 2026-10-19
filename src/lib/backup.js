// Chat backup and status download jobs (run in the content script, talk to the bridge over RPC).
import { createZip } from './zip.js';
import { datedName } from './export/index.js';
import { backupIndexHTML, chatToCSV, chatToHTML, chatToJSON, chatToTXT, extFor, mediaPathFor, normalizeMessages, safeFileName, stamp } from './export/chat.js';
import { xmlEscape as esc } from './export/xlsx.js';

export const CHAT_FORMATS = [
  { id: 'html', label: 'HTML viewer', hint: 'Looks like WhatsApp, searchable', file: 'chat.html', mime: 'text/html;charset=utf-8' },
  { id: 'txt', label: 'Text', hint: "Same as WhatsApp's own export", file: 'chat.txt', mime: 'text/plain;charset=utf-8' },
  { id: 'json', label: 'JSON', hint: 'Full data', file: 'chat.json', mime: 'application/json' },
  { id: 'csv', label: 'CSV', hint: 'One row per message', file: 'chat.csv', mime: 'text/csv;charset=utf-8' },
];

export const MEDIA_KINDS = [
  { id: 'image', label: 'Photos', types: ['image'] },
  { id: 'video', label: 'Videos & GIFs', types: ['video', 'gif', 'ptv'] },
  { id: 'audio', label: 'Voice & audio', types: ['audio', 'ptt'] },
  { id: 'document', label: 'Documents', types: ['document'] },
  { id: 'sticker', label: 'Stickers', types: ['sticker'] },
];

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function mapLimit(items, limit, worker, isCancelled = () => false) {
  let next = 0;
  const run = async () => {
    while (next < items.length && !isCancelled()) {
      const i = next++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

const chatTitleOf = (chat) => chat.title || (chat.phone ? `+${chat.phone}` : chat.id);

function renderChat(fmt, chat, norm, meta, backLink) {
  switch (fmt) {
    case 'html': return chatToHTML(chat, norm, { backLink });
    case 'txt': return chatToTXT(norm);
    case 'json': return chatToJSON(chat, norm, meta);
    case 'csv': return chatToCSV(norm);
    default: throw new Error(`Unknown chat format ${fmt}`);
  }
}

/**
 * @param {object} p
 * @param {object[]} p.chats         chat records from the snapshot
 * @param {string[]} p.formats       CHAT_FORMATS ids
 * @param {string[]} p.mediaKinds    MEDIA_KINDS ids to download ([] = no media)
 * @param {number|null} p.sinceTs    only messages at/after this unix time
 * @param {number|null} p.maxMessages cap per chat
 * @param {(sender, msg) => string} p.nameOf
 * @param {(method, params, opts) => {promise, cancel}} p.call RPC
 * @param {(state) => void} p.onProgress
 * @param {{ cancelled: boolean, cancelCurrent?: Function }} p.control
 */
export async function runChatBackup({ chats, formats, mediaKinds = [], sinceTs = null, maxMessages = null, nameOf, call, onProgress, control }) {
  const mediaTypes = new Set(MEDIA_KINDS.filter((k) => mediaKinds.includes(k.id)).flatMap((k) => k.types));
  const stats = { chats: 0, messages: 0, media: 0, mediaFailed: 0, partial: 0, errors: [] };
  const results = [];
  const zip = createZip();
  const singleFile = chats.length === 1 && formats.length === 1 && mediaTypes.size === 0;
  let single = null;

  for (let ci = 0; ci < chats.length; ci++) {
    if (control.cancelled) break;
    const chat = chats[ci];
    const title = chatTitleOf(chat);
    const base = { chatIndex: ci, chatTotal: chats.length, chatTitle: title, stats };
    onProgress({ ...base, phase: 'messages', loaded: 0 });

    let history;
    try {
      const job = call('loadChatHistory', { chatId: chat.id, options: { sinceTs, maxMessages } }, { onProgress: (p) => onProgress({ ...base, phase: 'messages', loaded: p.loaded }) });
      control.cancelCurrent = job.cancel;
      history = await job.promise;
    } catch (e) {
      stats.errors.push(`${title}: ${e.message}`);
      continue;
    }
    if (!history.complete) stats.partial += 1;

    const folder = safeFileName(`${title}`, 60);
    const mediaPaths = new Map();
    const wanted = history.messages.filter((m) => m.media?.downloadable && mediaTypes.has(m.media.type));
    if (!singleFile && wanted.length) {
      let done = 0;
      onProgress({ ...base, phase: 'media', mediaDone: 0, mediaTotal: wanted.length });
      await mapLimit(
        wanted,
        3,
        async (m) => {
          try {
            const job = call('downloadMedia', { msgId: m.id }, { timeoutMs: 120_000 });
            const res = await job.promise;
            const rel = mediaPathFor({ ...m, media: { ...m.media, mimetype: res.mimetype || m.media.mimetype } });
            const full = zip.add(`${folder}/${rel}`, new Uint8Array(res.buffer), { compress: false, mtime: new Date((m.t || 0) * 1000) });
            mediaPaths.set(m.id, full.slice(folder.length + 1));
            stats.media += 1;
          } catch {
            stats.mediaFailed += 1;
          }
          done += 1;
          onProgress({ ...base, phase: 'media', mediaDone: done, mediaTotal: wanted.length });
        },
        () => control.cancelled,
      );
    }

    const norm = normalizeMessages(history.messages, nameOf, mediaPaths);
    const meta = { complete: history.complete, sinceTs, maxMessages };
    stats.chats += 1;
    stats.messages += norm.length;

    if (singleFile) {
      const f = CHAT_FORMATS.find((x) => x.id === formats[0]);
      const ext = f.file.split('.').pop();
      single = { data: renderChat(f.id, history.chat, norm, meta, null), filename: datedName(`whatsapp-chat-${title}`, ext), mime: f.mime };
      break;
    }
    for (const fmt of formats) {
      const f = CHAT_FORMATS.find((x) => x.id === fmt);
      zip.add(`${folder}/${f.file}`, renderChat(fmt, history.chat, norm, meta, '../index.html'));
    }
    results.push({ title, folder, count: norm.length, media: mediaPaths.size, complete: history.complete });
  }

  if (single) return { kind: 'file', ...single, stats };
  if (!results.length) return { kind: 'none', stats };
  zip.add('index.html', backupIndexHTML(results));
  const name = results.length === 1 ? `whatsapp-chat-${results[0].title}` : `whatsapp-chats-${results.length}`;
  return { kind: 'zip', blob: zip.finish(), filename: datedName(name, 'zip'), stats };
}

/** Status downloader: selected status items → ZIP with folders per contact, manifest and gallery. */
export async function runStatusBackup({ items, nameOf, call, onProgress, control }) {
  const zip = createZip();
  const manifest = [];
  const stats = { saved: 0, failed: 0, text: 0 };
  let done = 0;
  await mapLimit(
    items,
    3,
    async ({ status, item }) => {
      const who = safeFileName(nameOf(status), 50);
      const entry = { contact: nameOf(status), phone: status.phone ? `+${status.phone}` : null, time: new Date(item.t * 1000).toISOString(), type: item.type, caption: item.text || null, file: null };
      if (item.media?.downloadable) {
        try {
          const res = await call('downloadMedia', { msgId: item.id }, { timeoutMs: 120_000 }).promise;
          const ext = extFor(res.mimetype, null, item.media.type);
          entry.file = zip.add(`${who}/${stamp(item.t)}-${item.media.type}.${ext}`, new Uint8Array(res.buffer), { compress: false, mtime: new Date(item.t * 1000) });
          entry.mimetype = res.mimetype;
          stats.saved += 1;
        } catch (e) {
          entry.error = e.message;
          stats.failed += 1;
        }
      } else if (!item.media) {
        stats.text += 1;
      }
      manifest.push(entry);
      done += 1;
      onProgress({ done, total: items.length });
    },
    () => control.cancelled,
  );
  manifest.sort((a, b) => a.contact.localeCompare(b.contact) || a.time.localeCompare(b.time));
  zip.add('manifest.json', JSON.stringify({ app: 'WAVault', exportedAt: new Date().toISOString(), items: manifest }, null, 2));
  zip.add('index.html', statusGalleryHTML(manifest));
  return { blob: zip.finish(), filename: datedName('whatsapp-status', 'zip'), stats };
}

export function statusGalleryHTML(manifest) {
  const cards = manifest
    .map((e) => {
      const src = e.file ? esc(encodeURI(e.file)) : '';
      const media = !e.file
        ? `<div class="txt">${esc(e.caption || (e.error ? 'Could not download' : 'Text status'))}</div>`
        : /^video/.test(e.mimetype || '') ? `<video src="${src}" controls preload="metadata"></video>`
          : /^audio/.test(e.mimetype || '') ? `<audio src="${src}" controls preload="none"></audio>`
            : `<a href="${src}" target="_blank"><img src="${src}" loading="lazy" alt=""></a>`;
      return `<figure>${media}<figcaption><b>${esc(e.contact)}</b><br>${esc(new Date(e.time).toLocaleString())}${e.file && e.caption ? `<br>${esc(e.caption)}` : ''}</figcaption></figure>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp status backup</title>
<style>body{margin:0;padding:24px;background:#F4F7F6;color:#17292C;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Bengali",sans-serif}
h1{margin:0 0 16px;font-size:22px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
figure{margin:0;background:#fff;border:1px solid #D3DDDA;border-radius:10px;overflow:hidden}
img,video{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;background:#10211F}audio{width:100%;margin:12px 0}
.txt{display:flex;align-items:center;justify-content:center;aspect-ratio:9/16;padding:16px;text-align:center;background:#0F7B68;color:#fff;font-size:17px;white-space:pre-wrap}
figcaption{padding:8px 10px;color:#5B6E6B;font-size:12.5px}figcaption b{color:#17292C}
@media (prefers-color-scheme:dark){body{background:#10211F;color:#E6EEEC}figure{background:#173030;border-color:#2A4442}figcaption b{color:#E6EEEC}}</style></head>
<body><h1>WhatsApp status backup (${manifest.length})</h1><div class="g">${cards}</div></body></html>`;
}
