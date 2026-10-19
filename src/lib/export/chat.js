// Chat backup formats: HTML viewer, WhatsApp-style TXT, CSV, JSON.
import { toCSV } from './csv.js';
import { xmlEscape as esc } from './xlsx.js';

const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr', 'audio/wav': 'wav',
  'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt', 'text/vcard': 'vcf',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

export function extFor(mimetype, filename, type) {
  const fromName = /\.([a-z0-9]{1,8})$/i.exec(filename || '')?.[1];
  if (fromName) return fromName.toLowerCase();
  const base = String(mimetype || '').split(';')[0].trim().toLowerCase();
  if (MIME_EXT[base]) return MIME_EXT[base];
  return { image: 'jpg', video: 'mp4', gif: 'mp4', ptv: 'mp4', audio: 'ogg', ptt: 'ogg', sticker: 'webp' }[type] || 'bin';
}

export const safeFileName = (s, max = 80) =>
  String(s || '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max) || 'untitled';

const pad = (n) => String(n).padStart(2, '0');
export const stamp = (t) => {
  const d = new Date((t || 0) * 1000);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/** Relative path inside the backup for a message's media file. */
export function mediaPathFor(m) {
  const ext = extFor(m.media?.mimetype, m.media?.filename, m.media?.type);
  const short = String(m.id).replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'x';
  const name = m.media?.filename ? `${stamp(m.t)}-${safeFileName(m.media.filename.replace(/\.[^.]+$/, ''), 60)}` : `${stamp(m.t)}-${m.media?.type || 'media'}-${short}`;
  return `media/${name}.${ext}`;
}

const SYSTEM_TYPES = new Set(['e2e_notification', 'gp2', 'notification_template', 'notification', 'call_log', 'broadcast_notification', 'ciphertext', 'revoked', 'protocol']);

const MEDIA_LABEL = { image: 'Photo', video: 'Video', gif: 'GIF', ptv: 'Video message', audio: 'Audio', ptt: 'Voice message', document: 'Document', sticker: 'Sticker' };

function systemText(m) {
  switch (m.type) {
    case 'revoked': return 'This message was deleted';
    case 'call_log': return 'Call';
    case 'ciphertext': return 'Waiting for this message';
    case 'e2e_notification': return 'Messages are end-to-end encrypted';
    case 'gp2': return `Group update${m.subtype ? `: ${m.subtype.replace(/_/g, ' ')}` : ''}`;
    default: return m.text || (m.subtype ? m.subtype.replace(/_/g, ' ') : m.type.replace(/_/g, ' '));
  }
}

/**
 * Normalises bridge messages for every chat format.
 * @param {object[]} messages bridge messages
 * @param {(sender:object, msg:object)=>string} nameOf sender display name resolver
 * @param {Map<string,string>} mediaPaths msgId -> relative media path (only for saved media)
 */
export function normalizeMessages(messages, nameOf, mediaPaths = new Map()) {
  return messages
    .filter((m) => m.type !== 'protocol')
    .map((m) => {
      const system = SYSTEM_TYPES.has(m.type) && m.type !== 'revoked' ? true : m.type === 'revoked' ? 'revoked' : false;
      let text = m.text || '';
      if (m.type === 'location' && m.lat != null) text = [m.text && m.text !== `${m.lat},${m.lng}` ? m.text.replace(`${m.lat},${m.lng}`, '').trim() : '', `https://maps.google.com/?q=${m.lat},${m.lng}`].filter(Boolean).join('\n');
      if (m.type === 'poll_creation') text = `Poll: ${m.text || ''}${m.pollOptions?.length ? '\n' + m.pollOptions.map((o) => `- ${o}`).join('\n') : ''}`;
      if (m.type === 'vcard') text = `Contact card: ${m.vcardName || ''}`;
      if (system) text = systemText(m);
      return {
        id: m.id,
        t: m.t,
        fromMe: !!m.sender?.fromMe,
        sender: system === true ? '' : nameOf(m.sender, m),
        senderPhone: m.sender?.phone ? `+${m.sender.phone}` : '',
        type: m.type,
        system: system === true,
        deleted: m.type === 'revoked',
        text,
        mediaType: m.media?.type || null,
        mediaLabel: m.media ? MEDIA_LABEL[m.media.type] || 'Media' : null,
        mediaName: m.media?.filename || null,
        mediaPath: mediaPaths.get(m.id) || null,
        mimetype: m.media?.mimetype || null,
        thumbnail: m.thumbnail || null,
        quoted: m.quoted?.text || (m.quoted ? '(earlier message)' : null),
        forwarded: !!m.isForwarded,
        starred: !!m.starred,
        edited: !!m.edited,
      };
    });
}

const dmy = (t) => {
  const d = new Date(t * 1000);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const hm = (t) => {
  const d = new Date(t * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Same layout as WhatsApp's own "Export chat" (Android), so existing chat-analysis tools can read it. */
export function chatToTXT(norm) {
  return norm
    .map((m) => {
      const when = `${dmy(m.t)}, ${hm(m.t)} - `;
      if (m.system) return when + m.text;
      let body = m.text;
      if (m.mediaType) {
        const file = m.mediaPath ? `${m.mediaPath.split('/').pop()} (file attached)` : '<Media omitted>';
        body = m.text ? `${file}\n${m.text}` : file;
      }
      if (m.edited) body += ' <This message was edited>';
      return `${when}${m.sender}: ${body}`;
    })
    .join('\n') + '\n';
}

export function chatToCSV(norm) {
  const headers = ['Date', 'Time', 'Sender', 'Sender phone', 'From me', 'Type', 'Message', 'Media file', 'Quoted message', 'Forwarded', 'Starred', 'Edited', 'Message ID'];
  const rows = norm.map((m) => [dmy(m.t), hm(m.t), m.sender, m.senderPhone, m.fromMe ? 'Yes' : 'No', m.system ? 'system' : m.type, m.text, m.mediaPath || (m.mediaType ? 'not saved' : ''), m.quoted || '', m.forwarded ? 'Yes' : '', m.starred ? 'Yes' : '', m.edited ? 'Yes' : '', m.id]);
  return toCSV({ headers, rows });
}

export function chatToJSON(chat, norm, meta) {
  return JSON.stringify({ app: 'WAVault', exportedAt: new Date().toISOString(), chat, ...meta, messageCount: norm.length, messages: norm.map(({ thumbnail, ...m }) => m) }, null, 2);
}

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

export const VIEWER_CSS = `
:root{--bg:#EFEAE2;--panel:#F7F8FA;--ink:#111B21;--muted:#667781;--in:#FFFFFF;--out:#D9FDD3;--line:#D1D7DB;--accent:#0F7B68;--sys:#FFF3C4;--hl:#FFE066}
@media (prefers-color-scheme:dark){:root{--bg:#0B141A;--panel:#202C33;--ink:#E9EDEF;--muted:#8696A0;--in:#202C33;--out:#005C4B;--line:#2A3942;--accent:#25B39A;--sys:#1F2C34;--hl:#8A6D00}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:var(--bg);color:var(--ink);font:14.2px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Bengali","Apple Color Emoji","Segoe UI Emoji",sans-serif}
header{position:sticky;top:0;z-index:2;display:flex;gap:12px;align-items:center;padding:10px 16px;background:var(--panel);border-bottom:1px solid var(--line)}
header .who{flex:1;min-width:0}
header h1{font-size:16px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
header p{margin:0;color:var(--muted);font-size:12.5px}
header input{width:min(260px,40vw);padding:7px 12px;border-radius:18px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit}
header a{color:var(--accent);font-size:13px;white-space:nowrap}
main{max-width:920px;margin:0 auto;padding:12px 4% 40px}
.day{content-visibility:auto;contain-intrinsic-size:auto 600px}
.date{position:sticky;top:58px;z-index:1;display:block;width:max-content;margin:14px auto 8px;padding:4px 12px;border-radius:8px;background:var(--panel);color:var(--muted);font-size:12.5px;box-shadow:0 1px .5px rgba(11,20,26,.13)}
.m{display:flex;margin:2px 0}.m.out{justify-content:flex-end}
.b{position:relative;max-width:min(78%,560px);padding:6px 8px 8px 9px;border-radius:8px;background:var(--in);box-shadow:0 1px .5px rgba(11,20,26,.13);overflow-wrap:anywhere;white-space:pre-wrap}
.out .b{background:var(--out)}
.s{font-size:12.8px;font-weight:600;margin-bottom:2px;white-space:normal}
.t{float:right;margin:6px 0 -4px 10px;font-size:11px;color:var(--muted)}
.q{border-left:4px solid var(--accent);background:rgba(0,0,0,.05);border-radius:6px;padding:4px 8px;margin-bottom:4px;font-size:13px;color:var(--muted);white-space:pre-wrap}
.f{font-size:12px;color:var(--muted);font-style:italic;margin-bottom:2px}
.sys{text-align:center;margin:6px 0}.sys span{display:inline-block;padding:4px 12px;border-radius:8px;background:var(--sys);color:var(--muted);font-size:12.5px}
.del{font-style:italic;color:var(--muted)}
.tx a{color:var(--accent);text-decoration:underline;overflow-wrap:anywhere}
.media img,.media video{display:block;max-width:100%;max-height:420px;border-radius:6px;margin-bottom:4px}
.media audio{width:260px;max-width:100%}
.doc{display:flex;gap:8px;align-items:center;padding:8px;border-radius:6px;background:rgba(0,0,0,.05);color:inherit;text-decoration:none;margin-bottom:4px}
.ph{display:inline-block;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.06);color:var(--muted);font-size:12.5px;margin-bottom:4px}
mark{background:var(--hl);color:inherit;border-radius:2px}
.hidden{display:none}
.empty{text-align:center;color:var(--muted);padding:40px}
`;

const VIEWER_JS = `
(function(){
var data=JSON.parse(document.getElementById('wv-data').textContent);
var main=document.querySelector('main'),q=document.getElementById('q'),info=document.getElementById('count');
var colors=['#1F7AEC','#C4007A','#7F66FF','#E26A00','#008069','#A5379F','#C8343E','#3A7F0D'];
function col(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return colors[Math.abs(h)%colors.length]}
function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
var fmtDay=new Intl.DateTimeFormat(undefined,{weekday:'short',year:'numeric',month:'long',day:'numeric'});
var fmtTime=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'});
function mark(parent,s,v){if(!v){parent.appendChild(document.createTextNode(s));return 0}var lo=s.toLowerCase(),i=0,j,n=0;while((j=lo.indexOf(v,i))>-1){parent.appendChild(document.createTextNode(s.slice(i,j)));parent.appendChild(el('mark','',s.slice(j,j+v.length)));i=j+v.length;n++}parent.appendChild(document.createTextNode(s.slice(i)));return n}
function paint(node,text,v){node.textContent='';text.split(/(https?:\\/\\/[^\\s<>"]+)/).forEach(function(part,k){if(k%2){var a=el('a');a.href=part;a.target='_blank';a.rel='noopener noreferrer';mark(a,part,v);node.appendChild(a)}else mark(node,part,v)})}
function media(m){var w=el('div','media');
 if(m.mediaPath){var p=encodeURI(m.mediaPath);
  if(m.mediaType==='image'||m.mediaType==='sticker'){var i=el('img');i.src=p;i.loading='lazy';i.alt=m.mediaLabel;var a=el('a');a.href=p;a.target='_blank';a.appendChild(i);w.appendChild(a)}
  else if(m.mediaType==='video'||m.mediaType==='gif'||m.mediaType==='ptv'){var v=el('video');v.src=p;v.controls=true;v.preload='metadata';if(m.mediaType==='gif'){v.loop=true;v.muted=true}w.appendChild(v)}
  else if(m.mediaType==='audio'||m.mediaType==='ptt'){var au=el('audio');au.src=p;au.controls=true;au.preload='none';w.appendChild(au)}
  else{var d=el('a','doc');d.href=p;d.target='_blank';d.textContent='\\u{1F4C4} '+(m.mediaName||m.mediaPath.split('/').pop());w.appendChild(d)}
 }else if(m.thumbnail){var ti=el('img');ti.src='data:image/jpeg;base64,'+m.thumbnail;ti.alt=m.mediaLabel+' preview';w.appendChild(ti);w.appendChild(el('span','ph',m.mediaLabel+' not saved (preview only)'))}
 else w.appendChild(el('span','ph',m.mediaLabel+(m.mediaName?': '+m.mediaName:'')+' not saved'));
 return w}
function render(){
 if(!data.messages.length){main.appendChild(el('p','empty','This chat has no messages in the backup.'));return}
 var day=null,box=null;
 data.messages.forEach(function(m,ix){
  var d=new Date(m.t*1000),k=d.toDateString();
  if(k!==day){day=k;box=el('section','day');box.appendChild(el('span','date',fmtDay.format(d)));main.appendChild(box)}
  var row;
  if(m.system){row=el('div','sys');row.appendChild(el('span','',m.text))}
  else{row=el('div','m '+(m.fromMe?'out':'in'));var b=el('div','b');
   if(data.isGroup&&!m.fromMe){var s=el('div','s',m.sender||m.senderPhone);s.style.color=col(m.sender||m.senderPhone||'');b.appendChild(s)}
   if(m.forwarded)b.appendChild(el('div','f','Forwarded'));
   if(m.quoted)b.appendChild(el('div','q',m.quoted));
   if(m.mediaType)b.appendChild(media(m));
   if(m.deleted)b.appendChild(el('span','del','This message was deleted'));
   else if(m.text){var tx=el('span','tx');paint(tx,m.text,'');b.appendChild(tx)}
   b.appendChild(el('span','t',(m.starred?'\\u2605 ':'')+(m.edited?'Edited ':'')+fmtTime.format(d)));
   row.appendChild(b)}
  row.dataset.i=ix;box.appendChild(row)});
}
render();
var rows=[].slice.call(main.querySelectorAll('[data-i]'));
function search(){var v=q.value.trim().toLowerCase(),n=0;
 rows.forEach(function(r){var m=data.messages[r.dataset.i];var tx=r.querySelector('.tx');
  if(tx)paint(tx,m.text,v);
  if(!v){r.classList.remove('hidden');return}
  var hay=((m.text||'')+' '+(m.sender||'')+' '+(m.mediaName||'')).toLowerCase();
  var hit=hay.indexOf(v)>-1;r.classList.toggle('hidden',!hit);if(hit)n++});
 main.querySelectorAll('.day').forEach(function(d){d.classList.toggle('hidden',!!v&&!d.querySelector('[data-i]:not(.hidden)'))});
 info.textContent=v?n+' matching messages':data.messages.length+' messages'}
var timer;q.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(search,150)});
info.textContent=data.messages.length+' messages';
})();`;

export function chatToHTML(chat, norm, { backLink = null, exportedAt = new Date() } = {}) {
  const title = chat.title || (chat.phone ? `+${chat.phone}` : 'Chat');
  const data = { isGroup: chat.kind === 'group', messages: norm };
  const range = norm.length ? `${new Date(norm[0].t * 1000).toLocaleDateString()} to ${new Date(norm[norm.length - 1].t * 1000).toLocaleDateString()}` : 'No messages';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}: WhatsApp backup</title><style>${VIEWER_CSS}</style></head><body>
<header>${backLink ? `<a href="${esc(backLink)}">All chats</a>` : ''}<div class="who"><h1>${esc(title)}</h1><p><span id="count"></span>, ${esc(range)}. Backed up ${esc(exportedAt.toLocaleString())}</p></div>
<input id="q" type="search" placeholder="Search messages" aria-label="Search messages"></header>
<main></main>
<script type="application/json" id="wv-data">${jsonForScript(data)}</script>
<script>${VIEWER_JS}</script></body></html>`;
}

export function backupIndexHTML(entries, { exportedAt = new Date() } = {}) {
  const rows = entries
    .map((e) => `<a class="row" href="${esc(encodeURI(e.folder))}/chat.html"><span class="n">${esc(e.title)}</span><span class="c">${e.count} messages${e.media ? `, ${e.media} media files` : ''}${e.complete ? '' : ', partial history'}</span></a>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp chat backup</title>
<style>${VIEWER_CSS}
.list{max-width:720px;margin:24px auto;padding:0 16px}.list h1{font-size:22px;margin:0 0 4px}.list p{color:var(--muted);margin:0 0 16px}
.row{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;margin:0 0 6px;border-radius:8px;background:var(--panel);color:var(--ink);text-decoration:none}
.row:hover,.row:focus-visible{outline:2px solid var(--accent)}.c{color:var(--muted);font-size:13px;white-space:nowrap}</style></head>
<body><div class="list"><h1>WhatsApp chat backup</h1><p>${entries.length} chats, backed up ${esc(exportedAt.toLocaleString())}</p>${rows}</div></body></html>`;
}
