// Demo-only bridge that answers the dashboard's RPC with generated, fictional data.
// Lets the UI be developed and reviewed without a WhatsApp login. Not part of the extension build.
import { CHANNEL, isFromChannel } from '../src/shared/protocol.js';

const FIRST = ['Rahim', 'Karim', 'Nusrat', 'Farhana', 'Tanvir', 'Sadia', 'Arif', 'Mitu', 'Jamal', 'Rupa', 'Imran', 'Shila', 'Hasan', 'Lamia', 'Sabbir', 'Tania', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Mateo', 'Sofia', 'Yuki', 'Chen', 'Priya', 'Arjun', 'Fatima', 'Omar', 'Lucas', 'Anika', 'Rafi', 'Nabila', 'Zara', 'Ethan', 'Mia', 'Kenji', 'Aisha', 'Diego', 'Leila'];
const LAST = ['Uddin', 'Hossain', 'Akter', 'Rahman', 'Islam', 'Khan', 'Chowdhury', 'Ahmed', 'Sarkar', 'Begum', 'Smith', 'Garcia', 'Müller', 'Rossi', 'Tanaka', 'Wang', 'Patel', 'Silva', 'Kowalski', 'Novak', 'Mahmud', 'Karim', 'Nguyen', 'Dubois', 'Haque'];
const BN_FIRST = ['রহিম', 'নুসরাত', 'তানভীর', 'সাদিয়া', 'আরিফ', 'মিতু', 'করিম', 'ফারহানা'];
const BN_LAST = ['উদ্দিন', 'জাহান', 'আহমেদ', 'ইসলাম', 'হোসেন', 'আক্তার'];
const BIZ_A = ['Green Leaf', 'Oak & Pine', 'Dhaka', 'Rapid', 'Sunrise', 'Blue Bay', 'Metro', 'Fresh Basket', 'Riverside', 'Golden Hour'];
const BIZ_B = ['Nursery', 'Tree Care', 'Garden Supply', 'Courier', 'Pharmacy', 'Travels', 'Hardware', 'Grocery', 'Bakery', 'Electronics'];
const GROUPS = ['Tree Crew 🌳', 'Family', 'Office team', 'Uttara Neighbours', 'Suppliers', 'University batch 2015', 'Football Fridays', 'Customer VIP'];
const LABELS = [{ id: '1', name: 'New customer' }, { id: '2', name: 'Paid' }, { id: '3', name: 'Pending payment' }, { id: '4', name: 'Order complete' }];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];
// Every generated person and business gets a distinct name, like a real address book.
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const PEOPLE = shuffled(FIRST.flatMap((f) => LAST.map((l) => `${f} ${l}`)));
const BN = shuffled(BN_FIRST.flatMap((f) => BN_LAST.map((l) => `${f} ${l}`)));
const BIZ = shuffled(BIZ_A.flatMap((a) => BIZ_B.map((b) => `${a} ${b}`)));
let personNo = 0;
let bizNo = 0;
const nextPerson = () => PEOPLE[personNo++ % PEOPLE.length];
const nextBiz = () => BIZ[bizNo++ % BIZ.length];
const now = Math.floor(Date.now() / 1000);

// Only numbers reserved for fiction, so screenshots never show a real person's number:
// US 1-NXX-555-0100..0199 and UK Ofcom drama range +44 7700 900000..900999.
const US_AREAS = ['202', '212', '213', '305', '312', '415', '512', '617', '702', '808'];
function phoneFor(i) {
  if (i % 3 === 0) {
    const k = i / 3;
    return `1${US_AREAS[k % 10]}55501${String(Math.floor(k / 10) % 100).padStart(2, '0')}`;
  }
  return `447700900${String((i - Math.floor(i / 3)) % 1000).padStart(3, '0')}`;
}

function generate() {
  const contacts = [];
  for (let i = 0; i < 640; i++) {
    const phone = phoneFor(i);
    const isBiz = i % 13 === 0;
    const name = isBiz ? nextBiz() : i % 17 === 0 ? BN[(i / 17) % BN.length] : nextPerson();
    contacts.push({
      id: `${phone}@c.us`, server: 'c.us', phone, lid: String(90000000000000 + i), name: i % 37 === 0 ? null : name, shortName: name.split(' ')[0], pushname: rnd() > 0.4 ? `${pick(FIRST)}${rnd() > 0.7 ? ' ✨' : ''}` : null,
      verifiedName: isBiz ? name : null, username: rnd() > 0.85 ? `${pick(FIRST).toLowerCase()}.${i}` : null, about: rnd() > 0.9 ? 'Available' : null,
      isMyContact: i % 37 !== 0, isWAContact: true, isBusiness: isBiz, isEnterprise: false, isBlocked: i === 42 || i === 99, isMe: i === 0, labels: isBiz ? [pick(LABELS).id] : [], profilePicUrl: null,
    });
  }
  const addressBookOnly = Array.from({ length: 160 }, (_, i) => ({ phone: phoneFor(1000 + i), name: nextPerson(), shortName: null }));
  const chats = [];
  for (let i = 1; i < 60; i++) {
    const c = contacts[i * 9];
    chats.push({ id: c.id, server: 'c.us', kind: 'user', title: c.name || c.pushname, phone: c.phone, lid: c.lid, unreadCount: i % 4 === 0 ? Math.ceil(rnd() * 12) : i % 9 === 0 ? -1 : 0, lastActivity: now - i * 5400, archived: i % 10 === 0, pinned: i < 3, muted: false, readOnly: false, labels: c.labels, loadedMessages: 20 });
  }
  const groups = GROUPS.map((subject, gi) => {
    const participants = Array.from({ length: 6 + gi * 4 }, (_, k) => {
      const c = contacts[(gi * 31 + k * 7) % contacts.length];
      const hidden = k % 9 === 8;
      return { id: hidden ? `${80000000000000 + gi * 100 + k}@lid` : c.id, phone: hidden ? null : c.phone, lid: hidden ? String(80000000000000 + gi * 100 + k) : c.lid, isAdmin: k === 1, isSuperAdmin: k === 0 };
    });
    // Leave one group unloaded so "Load member lists" can be exercised.
    const loaded = gi !== 5;
    const id = `1203630000000000${gi}@g.us`;
    chats.push({ id, server: 'g.us', kind: 'group', title: subject, phone: null, lid: null, unreadCount: gi % 3 === 0 ? 5 : 0, lastActivity: now - gi * 3600, archived: false, pinned: gi === 0, muted: gi > 4, readOnly: false, labels: [], loadedMessages: 40 });
    return { id, subject, description: gi === 0 ? 'Daily jobs, photos and invoices' : null, createdAt: now - (gi + 1) * 86400 * 120, owner: contacts[gi].phone, size: participants.length, isCommunity: gi === 7, announceOnly: gi === 7, restricted: false, iAmAdmin: gi < 3, iAmMember: true, archived: false, unreadCount: 0, lastActivity: now - gi * 3600, participantsLoaded: loaded, participants: loaded ? participants : [] };
  });
  return { takenAt: Date.now(), me: { phone: contacts[0].phone, lid: contacts[0].lid, name: 'Demo account', isBusiness: true }, contacts, addressBookOnly, chats, groups, labels: LABELS.map((l) => ({ ...l, color: null, count: 3 })), blocked: [], warnings: [] };
}

const snapshot = generate();
const groupsFull = new Map();

function jpeg(w, h, hue, label) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, `hsl(${hue} 55% 45%)`);
  grd.addColorStop(1, `hsl(${(hue + 60) % 360} 60% 30%)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = `bold ${Math.round(w / 9)}px sans-serif`;
  g.fillText(label, w * 0.08, h * 0.9);
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
}

function messagesFor(chatId) {
  const chat = snapshot.chats.find((c) => c.id === chatId);
  const members = chat.kind === 'group' ? snapshot.groups.find((g) => g.id === chatId).participants : [];
  const lines = ['Assalamu alaikum! Can you come tomorrow?', 'Sure, around 10am works.', 'The big oak in the back needs trimming 🌳', 'Here is the quote for the job', 'Great, thank you!', 'আসসালামু আলাইকুম, কেমন আছেন?', 'Payment sent ✅', 'Please share the location'];
  const msgs = [];
  for (let i = 0; i < 140; i++) {
    const fromMe = i % 3 === 1;
    const sender = fromMe ? { fromMe: true, id: null, phone: null } : chat.kind === 'group' ? (() => { const p = members[i % Math.max(1, members.length)] || {}; return { fromMe: false, id: p.id, phone: p.phone }; })() : { fromMe: false, id: chat.id, phone: chat.phone };
    const t = now - (140 - i) * 3600 * 5;
    const base = { id: `${fromMe}_${chatId}_${i}`, t, subtype: null, sender, notifyName: null, quoted: i % 23 === 5 ? { id: 'q', text: lines[0], type: 'chat' } : null, isForwarded: i % 31 === 7, starred: i % 29 === 3, ack: 3, revoked: false, edited: i % 41 === 9, backgroundColor: null, lat: null, lng: null, pollOptions: null, vcardName: null };
    if (i === 0) msgs.push({ ...base, type: 'e2e_notification', sender: { fromMe: false }, text: '', media: null, thumbnail: null });
    else if (i % 17 === 4) msgs.push({ ...base, type: 'image', text: 'Before and after', media: { type: 'image', mimetype: 'image/jpeg', filename: null, size: 50000, downloadable: true, isViewOnce: false }, thumbnail: jpeg(96, 72, (i * 40) % 360, '') });
    else if (i % 19 === 6) msgs.push({ ...base, type: 'document', text: null, media: { type: 'document', mimetype: 'application/pdf', filename: `Quote ${i}.pdf`, size: 12000, downloadable: true, isViewOnce: false }, thumbnail: null });
    else if (i % 27 === 13) msgs.push({ ...base, type: 'ptt', text: null, media: { type: 'ptt', mimetype: 'audio/ogg; codecs=opus', filename: null, size: 9000, downloadable: i % 2 === 0, isViewOnce: false }, thumbnail: null });
    else if (i % 33 === 20) msgs.push({ ...base, type: 'revoked', text: null, media: null, thumbnail: null });
    else if (i % 37 === 30) msgs.push({ ...base, type: 'location', text: 'Uttara Sector 7 23.87,90.39', lat: 23.87, lng: 90.39, media: null, thumbnail: null });
    else msgs.push({ ...base, type: 'chat', text: lines[i % lines.length], media: null, thumbnail: null });
  }
  return msgs;
}

function statuses() {
  return snapshot.contacts.slice(3, 12).map((c, i) => ({
    id: c.id, phone: c.phone, isMine: false, unreadCount: 1, lastActivity: now - i * 900,
    items: Array.from({ length: 1 + (i % 3) }, (_, k) => {
      const t = now - i * 900 - k * 300;
      if ((i + k) % 4 === 3) return { id: `st_${i}_${k}`, t, type: 'chat', text: 'Good morning everyone ☀️', media: null, thumbnail: null, backgroundColor: 4282223189, sender: { fromMe: false, id: c.id, phone: c.phone } };
      const video = (i + k) % 5 === 2;
      return { id: `st_${i}_${k}`, t, type: video ? 'video' : 'image', text: k ? 'New project done' : null, media: { type: video ? 'video' : 'image', mimetype: video ? 'video/mp4' : 'image/jpeg', downloadable: true }, thumbnail: jpeg(90, 140, (i * 50 + k * 20) % 360, ''), backgroundColor: null, sender: { fromMe: false, id: c.id, phone: c.phone } };
    }),
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cancelled = new Set();

const handlers = {
  status: async () => ({ loaded: true, loggedIn: true, version: 'demo', capabilities: { contacts: true, chats: true, groups: true, labels: true, history: true, media: true, status: true, indexedDb: true } }),
  snapshot: async () => {
    await sleep(300);
    return structuredClone(snapshot);
  },
  loadGroupParticipants: async ({ groupIds }, ctx) => {
    const out = [];
    for (let i = 0; i < groupIds.length; i++) {
      await sleep(300);
      const g = snapshot.groups.find((x) => x.id === groupIds[i]);
      const full = groupsFull.get(g.id) || { ...g, participantsLoaded: true, participants: Array.from({ length: 12 }, (_, k) => ({ id: snapshot.contacts[100 + k].id, phone: snapshot.contacts[100 + k].phone, lid: snapshot.contacts[100 + k].lid, isAdmin: k === 0, isSuperAdmin: false })) };
      groupsFull.set(g.id, full);
      out.push(full);
      ctx.progress({ done: i + 1, total: groupIds.length });
    }
    return out;
  },
  loadChatHistory: async ({ chatId }, ctx) => {
    for (let n = 20; n <= 140; n += 40) {
      if (ctx.isCancelled()) break;
      ctx.progress({ loaded: n });
      await sleep(200);
    }
    const chat = snapshot.chats.find((c) => c.id === chatId);
    return { chat, complete: !chatId.endsWith('@g.us'), messages: messagesFor(chatId) };
  },
  statuses: async () => {
    await sleep(300);
    return { statuses: statuses(), warnings: [] };
  },
  downloadMedia: async ({ msgId }) => {
    await sleep(120);
    if (msgId.includes('_13')) throw new Error('Media unavailable (expired on WhatsApp servers)');
    const b64 = jpeg(640, 480, msgId.length * 30, 'WAVault demo');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { buffer: bytes.buffer, mimetype: 'image/jpeg', filename: null, type: 'image' };
  },
  cancel: ({ jobId }) => {
    cancelled.add(jobId);
    return true;
  },
};

window.addEventListener('message', async (event) => {
  if (!isFromChannel(event, 'req')) return;
  const { id, method, params } = event.data;
  const post = (m, transfer) => window.postMessage({ ...m, channel: CHANNEL }, '*', transfer);
  try {
    const result = await handlers[method](params || {}, { progress: (data) => post({ __wavault: 'progress', id, data }), isCancelled: () => cancelled.has(id) });
    post({ __wavault: 'res', id, ok: true, result }, result?.buffer ? [result.buffer] : []);
  } catch (e) {
    post({ __wavault: 'res', id, ok: false, error: e.message });
  }
});
