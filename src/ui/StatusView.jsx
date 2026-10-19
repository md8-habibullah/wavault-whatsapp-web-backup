import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runStatusBackup } from '../lib/backup.js';
import { extFor, safeFileName, stamp } from '../lib/export/chat.js';
import { saveFile } from '../lib/download.js';
import { call, invoke } from '../shared/rpc-client.js';
import { JobPanel, plural, useToast } from './components.jsx';
import { makeNameOf } from './hooks.js';

const TYPE_LABEL = { image: 'Photo', video: 'Video', gif: 'GIF', audio: 'Audio', ptt: 'Voice', chat: 'Text' };

export default function StatusView({ snapshot, index }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [job, setJob] = useState(null);
  const control = useRef({ cancelled: false });
  const nameOfSender = useMemo(() => makeNameOf(index, snapshot.me), [index, snapshot.me]);
  const nameOf = useCallback((s) => (s.isMine ? 'My status' : nameOfSender({ phone: s.phone, id: s.id })), [nameOfSender]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await invoke('statuses', {}, { timeoutMs: 60000 }));
      setSelected(new Set());
    } catch (e) {
      toast(`Could not load statuses: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const statuses = data?.statuses || [];
  const all = useMemo(() => statuses.flatMap((s) => s.items.map((item) => ({ status: s, item }))), [statuses]);
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const downloadOne = async (status, item) => {
    if (!item.media) {
      saveFile(`${nameOf(status)}\n${new Date(item.t * 1000).toLocaleString()}\n\n${item.text || ''}\n`, `${safeFileName(nameOf(status), 50)}-${stamp(item.t)}-status.txt`, 'text/plain;charset=utf-8');
      return;
    }
    try {
      const res = await invoke('downloadMedia', { msgId: item.id }, { timeoutMs: 120000 });
      saveFile(res.buffer, `${safeFileName(nameOf(status), 50)}-${stamp(item.t)}.${extFor(res.mimetype, null, item.media.type)}`, res.mimetype);
    } catch (e) {
      toast(`Could not download: ${e.message}`, 'error');
    }
  };

  const downloadMany = async () => {
    const items = selected.size ? all.filter((x) => selected.has(x.item.id)) : all;
    control.current = { cancelled: false };
    setJob({ done: 0, total: items.length });
    try {
      const res = await runStatusBackup({ items, nameOf, call, control: control.current, onProgress: (p) => setJob((j) => ({ ...j, ...p })) });
      saveFile(res.blob, res.filename);
      setJob((j) => ({
        ...j,
        finished: true,
        lines: [`Saved ${res.filename}`, `${plural(res.stats.saved, 'media file')}, ${plural(res.stats.text, 'text status', 'text statuses')}${res.stats.failed ? `, ${res.stats.failed} could not be downloaded` : ''}.`],
      }));
    } catch (e) {
      setJob(null);
      toast(`Status download failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="wv-view">
      <div className="wv-head">
        <div className="wv-title">
          <h2>Status</h2>
          <p>
            <span className="wv-bignum">{all.length.toLocaleString()}</span>
            <span className="wv-muted">updates from {plural(statuses.length, 'contact')}</span>
          </p>
        </div>
        <button type="button" className="wv-btn wv-btn-quiet" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Reload statuses'}
        </button>
      </div>

      <div className="wv-status-scroll">
        {data?.warnings?.map((w) => (
          <p key={w} className="wv-note">
            {w}
          </p>
        ))}
        {!loading && data && !statuses.length && (
          <div className="wv-empty wv-empty-big">
            <p>No status updates right now.</p>
            <p className="wv-muted">Statuses disappear after 24 hours. When your contacts post new ones, use Reload statuses.</p>
          </div>
        )}
        {statuses.map((s) => (
          <section key={s.id} className="wv-status-group" aria-label={nameOf(s)}>
            <h3>
              {nameOf(s)} <span className="wv-muted">{plural(s.items.length, 'update')}</span>
            </h3>
            <div className="wv-status-grid">
              {s.items.map((item) => {
                const on = selected.has(item.id);
                return (
                  <figure key={item.id} className={`wv-status-card${on ? ' on' : ''}`}>
                    <button type="button" className="wv-status-thumb" aria-pressed={on} aria-label={`Select ${TYPE_LABEL[item.media?.type || item.type] || 'update'} from ${new Date(item.t * 1000).toLocaleString()}`} onClick={() => toggle(item.id)}>
                      {item.thumbnail ? (
                        <img src={`data:image/jpeg;base64,${item.thumbnail}`} alt="" />
                      ) : (
                        <span className="wv-status-text" style={item.backgroundColor ? { background: `#${(item.backgroundColor >>> 0).toString(16).padStart(8, '0').slice(2)}` } : undefined}>
                          {item.media ? TYPE_LABEL[item.media.type] || 'Media' : item.text}
                        </span>
                      )}
                      <span className="wv-status-type">{TYPE_LABEL[item.media?.type || item.type] || item.type}</span>
                    </button>
                    <figcaption>
                      <span>{new Date(item.t * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      <button type="button" className="wv-link" onClick={() => downloadOne(s, item)} disabled={item.media && !item.media.downloadable} aria-label={`Save this ${(TYPE_LABEL[item.media?.type || item.type] || 'update').toLowerCase()}`}>
                        Save
                      </button>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="wv-dock">
        <div className="wv-dock-scope">
          <span className="wv-muted">{selected.size ? `${selected.size} selected` : 'Click updates to select them, or save them all.'}</span>
          {selected.size > 0 && (
            <button type="button" className="wv-link" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          )}
        </div>
        <div className="wv-dock-actions">
          <button type="button" className="wv-btn wv-btn-primary" disabled={!all.length} onClick={downloadMany}>
            {selected.size ? `Save ${plural(selected.size, 'update')} as ZIP` : `Save all ${plural(all.length, 'update')} as ZIP`}
          </button>
        </div>
      </div>

      {job && (
        <JobPanel
          title={job.finished ? 'Statuses saved' : 'Saving statuses'}
          percent={job.total ? (job.done / job.total) * 100 : 0}
          lines={job.finished ? job.lines : [`${job.done} of ${job.total} updates`]}
          done={job.finished}
          onCancel={() => {
            control.current.cancelled = true;
          }}
          onClose={() => setJob(null)}
        />
      )}
    </div>
  );
}
