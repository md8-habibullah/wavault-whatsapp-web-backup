import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { chatToCSV, chatToHTML, chatToTXT, extFor, mediaPathFor, normalizeMessages } from '../src/lib/export/chat.js';
import { runChatBackup, runStatusBackup } from '../src/lib/backup.js';
import { messages, snapshot } from './fixtures.js';

const nameOf = (s) => (s.fromMe ? 'You' : s.phone === '8801711111111' ? 'রহিম উদ্দিন' : s.phone ? `+${s.phone}` : 'Unknown');
const chat = snapshot.chats[0];

describe('normalizeMessages', () => {
  const norm = normalizeMessages(messages, nameOf, new Map([['false_x_A4', 'media/x.jpg']]));
  it('drops protocol messages and labels system/deleted ones', () => {
    expect(norm).toHaveLength(7);
    expect(norm[0]).toMatchObject({ system: true, text: 'Messages are end-to-end encrypted', sender: '' });
    expect(norm.find((m) => m.id === 'false_x_A6')).toMatchObject({ deleted: true, system: false });
  });
  it('fills media, quotes, location', () => {
    expect(norm.find((m) => m.id === 'false_x_A4')).toMatchObject({ mediaPath: 'media/x.jpg', mediaLabel: 'Photo', forwarded: true, text: 'The oak tree' });
    expect(norm.find((m) => m.id === 'true_x_A3').quoted).toBe('How are you?');
    expect(norm.find((m) => m.id === 'false_x_A7').text).toBe('Dhaka\nhttps://maps.google.com/?q=23.8,90.4');
  });
});

describe('chat formats', () => {
  const norm = normalizeMessages(messages, nameOf, new Map([['false_x_A4', 'media/20251009-x.jpg']]));

  it('TXT follows the WhatsApp export layout', () => {
    const lines = chatToTXT(norm).split('\n');
    expect(lines[0]).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} - Messages are end-to-end encrypted$/);
    expect(lines[1]).toMatch(/ - রহিম উদ্দিন: আসসালামু আলাইকুম$/);
    expect(lines[2]).toBe('How are you? </script><b>x</b> javascript:alert(1)');
    expect(chatToTXT(norm)).toContain('You: Fine, thanks 👍 <This message was edited>');
    expect(chatToTXT(norm)).toContain('20251009-x.jpg (file attached)\nThe oak tree');
    expect(chatToTXT(norm)).toContain('রহিম উদ্দিন: <Media omitted>');
  });

  it('CSV has one row per message', () => {
    expect(chatToCSV(norm).trim().split('\r\n').length).toBeGreaterThanOrEqual(norm.length + 1);
  });

  it('HTML embeds data safely and renders bubbles', () => {
    const html = chatToHTML(chat, norm);
    expect(html).not.toContain('</script><b>x</b>');
    expect(html).toContain('\\u003c/script>');
    document.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '');
    // run the viewer script
    const code = [...document.querySelectorAll('script:not([type])')].map((s) => s.textContent).join('\n');
    new Function(code)();
    expect(document.querySelectorAll('.m').length).toBe(6);
    expect(document.querySelectorAll('.m.out').length).toBe(1);
    expect(document.querySelector('.media img').getAttribute('src')).toBe('media/20251009-x.jpg');
    expect(document.body.textContent).toContain('This message was deleted');
    const link = document.querySelector('.tx a');
    expect(link.getAttribute('href')).toBe('https://maps.google.com/?q=23.8,90.4');
    expect(link.rel).toContain('noopener');
    expect([...document.querySelectorAll('a')].some((a) => a.getAttribute('href')?.startsWith('javascript'))).toBe(false);
    const q = document.getElementById('q');
    q.value = 'oak';
    q.dispatchEvent(new Event('input'));
    return new Promise((r) => setTimeout(r, 200)).then(() => {
      expect(document.querySelectorAll('.m:not(.hidden)').length).toBe(1);
      expect(document.querySelector('mark').textContent).toBe('oak');
    });
  });

  it('picks file extensions from name, mime or type', () => {
    expect(extFor('application/pdf', 'Quote.PDF', 'document')).toBe('pdf');
    expect(extFor('audio/ogg; codecs=opus', null, 'ptt')).toBe('ogg');
    expect(extFor(null, null, 'sticker')).toBe('webp');
    expect(mediaPathFor(messages[4])).toMatch(/^media\/\d{8}-\d{6}-Quote_ 2026_10\.pdf$/);
  });
});

function fakeCall({ failMedia = new Set() } = {}) {
  return (method, params, opts) => {
    const promise = (async () => {
      if (method === 'loadChatHistory') {
        opts?.onProgress?.({ loaded: messages.length });
        if (params.chatId === 'missing') throw new Error('Chat not found');
        return { chat: snapshot.chats.find((c) => c.id === params.chatId) || chat, complete: params.chatId !== '922222222222222@lid', messages };
      }
      if (method === 'downloadMedia') {
        if (failMedia.has(params.msgId)) throw new Error('expired');
        return { buffer: new Uint8Array([1, 2, 3]).buffer, mimetype: params.msgId === 'false_x_A5' ? 'application/pdf' : 'image/jpeg' };
      }
      throw new Error('unexpected ' + method);
    })();
    return { promise, cancel: () => {}, id: 'x' };
  };
}

describe('runChatBackup', () => {
  it('returns a single file for one chat, one format, no media', async () => {
    const res = await runChatBackup({ chats: [chat], formats: ['txt'], mediaKinds: [], nameOf, call: fakeCall(), onProgress: () => {}, control: {} });
    expect(res.kind).toBe('file');
    expect(res.filename).toMatch(/^whatsapp-chat-রহিম-উদ্দিন-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(res.data).toContain('Fine, thanks');
  });

  it('builds a ZIP with folders, media, index and reports partial history and failures', async () => {
    const progress = [];
    const res = await runChatBackup({
      chats: [chat, snapshot.chats[1], { ...chat, id: 'missing', title: 'Gone' }],
      formats: ['html', 'txt', 'json', 'csv'],
      mediaKinds: ['image', 'document'],
      nameOf,
      call: fakeCall({ failMedia: new Set(['false_x_A5']) }),
      onProgress: (p) => progress.push(p.phase),
      control: {},
    });
    expect(res.kind).toBe('zip');
    const files = unzipSync(new Uint8Array(await res.blob.arrayBuffer()));
    const names = Object.keys(files);
    expect(names).toContain('index.html');
    expect(names).toContain('রহিম উদ্দিন/chat.html');
    expect(names).toContain('Stranger/chat.txt');
    expect(names.filter((n) => n.includes('/media/'))).toHaveLength(2); // one image per chat, the pdf failed
    expect(res.stats).toMatchObject({ chats: 2, media: 2, mediaFailed: 2, partial: 1 });
    expect(res.stats.errors[0]).toMatch(/Gone: Chat not found/);
    const html = strFromU8(files['রহিম উদ্দিন/chat.html']);
    const mediaFile = names.find((n) => n.startsWith('রহিম উদ্দিন/media/'));
    expect(html).toContain(mediaFile.slice('রহিম উদ্দিন/'.length));
    expect(strFromU8(files['index.html'])).toContain('partial history');
    expect(progress).toContain('media');
  });

  it('stops when cancelled', async () => {
    const control = { cancelled: true };
    const res = await runChatBackup({ chats: [chat], formats: ['html', 'txt'], nameOf, call: fakeCall(), onProgress: () => {}, control });
    expect(res.kind).toBe('none');
  });
});

describe('runStatusBackup', () => {
  it('saves media, text statuses and a manifest', async () => {
    const status = { id: '911111111111111@lid', phone: '8801711111111', items: [] };
    const items = [
      { status, item: { id: 'false_x_A4', t: 1760000000, type: 'image', text: 'cap', media: { type: 'image', downloadable: true } } },
      { status, item: { id: 's2', t: 1760000100, type: 'chat', text: 'hello status', media: null } },
    ];
    const res = await runStatusBackup({ items, nameOf, call: fakeCall(), onProgress: () => {}, control: {} });
    const files = unzipSync(new Uint8Array(await res.blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['manifest.json', 'index.html']));
    expect(Object.keys(files).some((n) => /^রহিম উদ্দিন\/\d{8}-\d{6}-image\.jpg$/.test(n))).toBe(true);
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    expect(manifest.items).toHaveLength(2);
    expect(res.stats).toEqual({ saved: 1, failed: 0, text: 1 });
    expect(strFromU8(files['index.html'])).toContain('hello status');
  });
});
