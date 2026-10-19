import { useMemo, useRef, useState } from 'react';
import { CHAT_PRESETS, filterChats } from '../lib/filters.js';
import { CHAT_FORMATS, MEDIA_KINDS, runChatBackup } from '../lib/backup.js';
import { saveFile } from '../lib/download.js';
import { call } from '../shared/rpc-client.js';
import { Badge, fmtDate, fmtPhone, JobPanel, MultiPick, plural, useToast, VirtualTable } from './components.jsx';
import { makeNameOf, usePref, useSelection } from './hooks.js';

const keyOf = (c) => c.id;
const KIND = { user: 'Person', group: 'Group', channel: 'Channel', broadcast: 'Broadcast' };

const PERIODS = [
  { id: 'all', label: 'All history', days: null },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '180', label: 'Last 6 months', days: 180 },
  { id: '365', label: 'Last year', days: 365 },
  { id: 'since', label: 'Since a date', days: null },
];

const TABLE_COLUMNS = [
  {
    id: 'title',
    label: 'Chat',
    width: 'minmax(200px, 2.2fr)',
    render: (c) => (
      <span className="wv-namecell-text">
        <strong>{c.title || fmtPhone(c.phone) || 'Unknown'}</strong>
        <small>{c.kind === 'user' && c.title && c.phone ? fmtPhone(c.phone) : KIND[c.kind] || c.kind}</small>
      </span>
    ),
  },
  {
    id: 'state',
    label: 'Status',
    width: 'minmax(150px, 1.3fr)',
    render: (c) => (
      <div className="wv-badges">
        {c.unreadCount !== 0 ? <Badge tone="jade">{c.unreadCount > 0 ? `${c.unreadCount} unread` : 'Marked unread'}</Badge> : <Badge>Read</Badge>}
        {c.pinned && <Badge>Pinned</Badge>}
        {c.archived && <Badge tone="amber">Archived</Badge>}
      </div>
    ),
  },
  { id: 'last', label: 'Last message', width: 'minmax(110px, 1fr)', render: (c) => fmtDate(c.lastActivity) },
];

export default function ChatsView({ snapshot, index }) {
  const toast = useToast();
  const [preset, setPreset] = useState('all');
  const [q, setQ] = useState('');
  const [labels, setLabels] = useState([]);
  const [formats, setFormats] = usePref('wv.chat.formats', ['html', 'txt']);
  const [mediaKinds, setMediaKinds] = usePref('wv.chat.media', ['image', 'video', 'audio', 'document']);
  const [period, setPeriod] = useState('all');
  const [since, setSince] = useState('');
  const [maxMessages, setMaxMessages] = useState('');
  const [job, setJob] = useState(null);
  const control = useRef({ cancelled: false });
  const { selected, toggle, setMany } = useSelection();

  const chats = useMemo(() => [...snapshot.chats].sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)), [snapshot.chats]);
  const shown = useMemo(() => filterChats(chats, preset, q, labels), [chats, preset, q, labels]);
  const counts = useMemo(() => Object.fromEntries(CHAT_PRESETS.map((p) => [p.id, chats.filter(p.test).length])), [chats]);
  const chosen = useMemo(() => chats.filter((c) => selected.has(c.id)), [chats, selected]);
  const target = chosen.length ? chosen : shown;
  const labelOptions = (snapshot.labels || []).map((l) => ({ value: String(l.id), label: l.name }));

  const sinceTs = (() => {
    const p = PERIODS.find((x) => x.id === period);
    if (p?.days) return Math.floor(Date.now() / 1000) - p.days * 86400;
    if (period === 'since' && since) return Math.floor(new Date(`${since}T00:00:00`).getTime() / 1000);
    return null;
  })();

  const toggleIn = (list, set, id) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const start = async () => {
    control.current = { cancelled: false };
    const startedAt = Date.now();
    setJob({ phase: 'messages', chatIndex: 0, chatTotal: target.length, loaded: 0, finished: false });
    try {
      const res = await runChatBackup({
        chats: target,
        formats,
        mediaKinds,
        sinceTs,
        maxMessages: Number(maxMessages) > 0 ? Number(maxMessages) : null,
        nameOf: makeNameOf(index, snapshot.me),
        call,
        control: control.current,
        onProgress: (p) => setJob((j) => ({ ...j, ...p })),
      });
      const s = res.stats;
      if (res.kind === 'file') saveFile(res.data, res.filename, res.mime);
      if (res.kind === 'zip') saveFile(res.blob, res.filename);
      const lines = [
        res.kind === 'none' ? (control.current.cancelled ? 'Backup stopped before any chat finished.' : 'Nothing was backed up.') : `Saved ${res.filename}`,
        `${plural(s.chats, 'chat')}, ${plural(s.messages, 'message')}${s.media || s.mediaFailed ? `, ${plural(s.media, 'media file')} saved` : ''}${s.mediaFailed ? `, ${s.mediaFailed} unavailable (expired on WhatsApp's servers)` : ''}.`,
        s.partial ? `${plural(s.partial, 'chat')} only include the history this browser could load. Older messages may still be on your phone only.` : null,
        control.current.cancelled ? 'Stopped early: the file contains the chats finished so far.' : null,
        ...s.errors.slice(0, 3),
        `Took ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))} seconds.`,
      ];
      setJob((j) => ({ ...j, finished: true, lines }));
    } catch (e) {
      setJob(null);
      toast(`Backup failed: ${e.message}`, 'error');
    }
  };

  const cancel = () => {
    control.current.cancelled = true;
    control.current.cancelCurrent?.();
  };

  const jobLines = job
    ? job.finished
      ? job.lines
      : [
          `Chat ${Math.min(job.chatIndex + 1, job.chatTotal)} of ${job.chatTotal}: ${job.chatTitle || ''}`,
          job.phase === 'messages' ? `Loading messages… ${(job.loaded || 0).toLocaleString()} so far` : `Saving media ${job.mediaDone || 0} of ${job.mediaTotal || 0}`,
          'Keep this tab open. WhatsApp loads older messages in pages, so long chats take a while.',
        ]
    : [];
  const jobPercent = job && !job.finished ? ((job.chatIndex + (job.phase === 'media' && job.mediaTotal ? 0.5 + (0.5 * (job.mediaDone || 0)) / job.mediaTotal : 0.25)) / job.chatTotal) * 100 : 100;

  return (
    <div className="wv-view">
      <div className="wv-head">
        <div className="wv-title">
          <h2>Chat backup</h2>
          <p>
            <span className="wv-bignum">{shown.length.toLocaleString()}</span>
            <span className="wv-muted">of {plural(chats.length, 'chat')}</span>
          </p>
        </div>
        <input className="wv-input wv-search" type="search" placeholder="Search chats or numbers" aria-label="Search chats" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="wv-split">
        <nav className="wv-presets" aria-label="Chat lists">
          {CHAT_PRESETS.map((p) => (
            <button key={p.id} type="button" className={preset === p.id ? 'on' : ''} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
              <span>{p.label}</span>
              <span className="wv-num">{counts[p.id].toLocaleString()}</span>
            </button>
          ))}
          {labelOptions.length > 0 && (
            <div className="wv-presets-extra">
              <MultiPick label="Labels" options={labelOptions} value={labels} onChange={setLabels} />
            </div>
          )}
        </nav>
        <div className="wv-tablecol">
          <VirtualTable label="Chats" rows={shown} columns={TABLE_COLUMNS} rowKey={keyOf} selected={selected} onToggle={toggle} onToggleMany={setMany} empty="No chats in this list." />
        </div>
        <aside className="wv-options" aria-label="Backup options">
          <fieldset>
            <legend>Formats</legend>
            {CHAT_FORMATS.map((f) => (
              <label key={f.id} className="wv-check">
                <input type="checkbox" checked={formats.includes(f.id)} onChange={() => toggleIn(formats, setFormats, f.id)} />
                <span>
                  {f.label}
                  <small className="wv-muted wv-block">{f.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Media to include</legend>
            {MEDIA_KINDS.map((k) => (
              <label key={k.id} className="wv-check">
                <input type="checkbox" checked={mediaKinds.includes(k.id)} onChange={() => toggleIn(mediaKinds, setMediaKinds, k.id)} />
                <span>{k.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Period</legend>
            <select className="wv-input" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {period === 'since' && <input className="wv-input" type="date" value={since} onChange={(e) => setSince(e.target.value)} aria-label="Since date" />}
            <label className="wv-field">
              <span>Most recent messages per chat</span>
              <input className="wv-input" type="number" min="1" placeholder="No limit" value={maxMessages} onChange={(e) => setMaxMessages(e.target.value)} />
            </label>
          </fieldset>
        </aside>
      </div>

      <div className="wv-dock">
        <div className="wv-dock-scope">
          <span className="wv-muted">
            {chosen.length ? `${chosen.length} selected` : `All ${shown.length} in this list`}
            {formats.length === 0 ? '. Choose at least one format.' : ''}
          </span>
        </div>
        <div className="wv-dock-actions">
          <button type="button" className="wv-btn wv-btn-primary" disabled={!target.length || !formats.length || (period === 'since' && !since)} onClick={start}>
            Back up {plural(target.length, 'chat')}
          </button>
        </div>
      </div>

      {job && <JobPanel title={job.finished ? 'Backup finished' : 'Backing up chats'} percent={jobPercent} lines={jobLines} done={job.finished} onCancel={cancel} onClose={() => setJob(null)} />}
    </div>
  );
}
