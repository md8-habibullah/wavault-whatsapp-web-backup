// Fictional sample data shaped exactly like the bridge snapshot (see src/bridge/extract.js).
export const snapshot = {
  takenAt: 1760000000000,
  me: { phone: '8801700000000', lid: '900000000000001', name: 'Me', isBusiness: true },
  contacts: [
    // Same person twice (phone record + LID record), as WhatsApp stores them.
    { id: '8801711111111@c.us', server: 'c.us', phone: '8801711111111', lid: '911111111111111', name: 'রহিম উদ্দিন', shortName: 'রহিম', pushname: 'Rahim 🌳', verifiedName: null, username: 'rahim.tree', about: 'Busy', isMyContact: true, isWAContact: true, isBusiness: false, isEnterprise: false, isBlocked: false, isMe: false, labels: ['1'], profilePicUrl: null },
    { id: '911111111111111@lid', server: 'lid', phone: '8801711111111', lid: '911111111111111', name: 'রহিম উদ্দিন', shortName: 'রহিম', pushname: null, verifiedName: null, username: null, about: null, isMyContact: true, isWAContact: true, isBusiness: false, isEnterprise: false, isBlocked: false, isMe: false, labels: [], profilePicUrl: null },
    { id: '15551234567@c.us', server: 'c.us', phone: '15551234567', lid: null, name: 'Acme, "Tree" Care; LLC', shortName: 'Acme', pushname: 'Acme', verifiedName: 'Acme Tree Care', username: null, about: null, isMyContact: true, isWAContact: true, isBusiness: true, isEnterprise: false, isBlocked: false, isMe: false, labels: ['2'], profilePicUrl: null },
    // Unsaved person who messaged us.
    { id: '922222222222222@lid', server: 'lid', phone: '447700900123', lid: '922222222222222', name: null, shortName: null, pushname: 'Stranger', verifiedName: null, username: null, about: null, isMyContact: false, isWAContact: true, isBusiness: false, isEnterprise: false, isBlocked: false, isMe: false, labels: [], profilePicUrl: null },
    // Blocked, formula-looking name.
    { id: '8801999999999@c.us', server: 'c.us', phone: '8801999999999', lid: null, name: '=HYPERLINK("http://x")', shortName: null, pushname: null, verifiedName: null, username: null, about: null, isMyContact: true, isWAContact: true, isBusiness: false, isEnterprise: false, isBlocked: false, isMe: false, labels: [], profilePicUrl: null },
    // Me
    { id: '8801700000000@c.us', server: 'c.us', phone: '8801700000000', lid: '900000000000001', name: null, shortName: null, pushname: 'Me', verifiedName: null, username: null, about: null, isMyContact: true, isWAContact: true, isBusiness: true, isEnterprise: false, isBlocked: false, isMe: true, labels: [], profilePicUrl: null },
  ],
  addressBookOnly: [
    { phone: '8801812345678', name: 'Karim (no WhatsApp)', shortName: 'Karim' },
    { phone: '8801711111111', name: 'রহিম উদ্দিন', shortName: 'রহিম' }, // duplicate of a WhatsApp contact: must not flip onWhatsApp
  ],
  chats: [
    { id: '911111111111111@lid', server: 'lid', kind: 'user', title: 'রহিম উদ্দিন', phone: '8801711111111', lid: '911111111111111', unreadCount: 3, lastActivity: 1760000100, archived: false, pinned: true, muted: false, readOnly: false, labels: [], loadedMessages: 10 },
    { id: '922222222222222@lid', server: 'lid', kind: 'user', title: 'Stranger', phone: '447700900123', lid: '922222222222222', unreadCount: 0, lastActivity: 1760000050, archived: true, pinned: false, muted: false, readOnly: false, labels: ['1'], loadedMessages: 2 },
    { id: '120363000000000001@g.us', server: 'g.us', kind: 'group', title: 'Tree Crew', phone: null, lid: null, unreadCount: -1, lastActivity: 1760000200, archived: false, pinned: false, muted: true, readOnly: false, labels: [], loadedMessages: 5 },
  ],
  groups: [
    {
      id: '120363000000000001@g.us', subject: 'Tree Crew', description: 'Crew chat', createdAt: 1700000000, owner: '8801700000000', size: 4, isCommunity: false, announceOnly: false, restricted: false, iAmAdmin: true, iAmMember: true, archived: false, unreadCount: -1, lastActivity: 1760000200, participantsLoaded: true,
      participants: [
        { id: '911111111111111@lid', phone: null, lid: '911111111111111', isAdmin: false, isSuperAdmin: false }, // LID only, resolved via contact list
        { id: '933333333333333@lid', phone: null, lid: '933333333333333', isAdmin: true, isSuperAdmin: false }, // hidden number
        { id: '8801700000000@c.us', phone: '8801700000000', lid: '900000000000001', isAdmin: true, isSuperAdmin: true },
        { id: '15551234567@c.us', phone: '15551234567', lid: null, isAdmin: false, isSuperAdmin: false },
      ],
    },
  ],
  labels: [
    { id: '1', name: 'New customer', color: null, count: 2 },
    { id: '2', name: 'Paid', color: null, count: 1 },
  ],
  blocked: ['8801999999999'],
  warnings: [],
};

export const messages = [
  { id: 'true_x_A1', t: 1760000000, type: 'e2e_notification', subtype: null, sender: { fromMe: false, id: null, phone: null }, text: '', media: null, thumbnail: null, quoted: null, isForwarded: false, starred: false, edited: false },
  { id: 'false_x_A2', t: 1760000010, type: 'chat', subtype: null, sender: { fromMe: false, id: '911111111111111@lid', phone: '8801711111111' }, text: 'আসসালামু আলাইকুম\nHow are you? </script><b>x</b> javascript:alert(1)', media: null, thumbnail: null, quoted: null, isForwarded: false, starred: true, edited: false },
  { id: 'true_x_A3', t: 1760000020, type: 'chat', subtype: null, sender: { fromMe: true, id: null, phone: null }, text: 'Fine, thanks 👍', media: null, thumbnail: null, quoted: { id: 'false_x_A2', text: 'How are you?', type: 'chat' }, isForwarded: false, starred: false, edited: true },
  { id: 'false_x_A4', t: 1760086400, type: 'image', subtype: null, sender: { fromMe: false, id: '911111111111111@lid', phone: '8801711111111' }, text: 'The oak tree', media: { type: 'image', mimetype: 'image/jpeg', filename: null, size: 1000, downloadable: true }, thumbnail: '/9j/AAAA', quoted: null, isForwarded: true, starred: false, edited: false },
  { id: 'false_x_A5', t: 1760086500, type: 'document', subtype: null, sender: { fromMe: false, id: '911111111111111@lid', phone: '8801711111111' }, text: null, media: { type: 'document', mimetype: 'application/pdf', filename: 'Quote: 2026/10.pdf', size: 2000, downloadable: true }, thumbnail: null, quoted: null, isForwarded: false, starred: false, edited: false },
  { id: 'false_x_A6', t: 1760086600, type: 'revoked', subtype: null, sender: { fromMe: false, id: '911111111111111@lid', phone: '8801711111111' }, text: null, media: null, thumbnail: null, quoted: null, isForwarded: false, starred: false, edited: false },
  { id: 'false_x_A7', t: 1760086700, type: 'location', subtype: null, sender: { fromMe: false, id: '911111111111111@lid', phone: '8801711111111' }, text: 'Dhaka 23.8,90.4', lat: 23.8, lng: 90.4, media: null, thumbnail: null, quoted: null, isForwarded: false, starred: false, edited: false },
  { id: 'false_x_A8', t: 1760086800, type: 'protocol', subtype: null, sender: { fromMe: false, id: null, phone: null }, text: null, media: null, thumbnail: null, quoted: null, isForwarded: false, starred: false, edited: false },
];
