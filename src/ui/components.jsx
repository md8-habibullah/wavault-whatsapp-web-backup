import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// ---------- toasts ----------

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'error' ? 9000 : 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="wv-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`wv-toast wv-toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- small controls ----------

export function Badge({ tone = 'plain', children, title }) {
  return (
    <span className={`wv-badge wv-badge-${tone}`} title={title}>
      {children}
    </span>
  );
}

/** Any / Yes / No switch for one facet. */
export function TriState({ label, value, onChange }) {
  const opts = [
    ['any', 'Any'],
    ['yes', 'Yes'],
    ['no', 'No'],
  ];
  return (
    <div className="wv-tri" role="radiogroup" aria-label={label}>
      <span className="wv-tri-label">{label}</span>
      <div className="wv-tri-opts">
        {opts.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Dropdown checklist with its own search (groups, labels, columns). */
export function MultiPick({ label, options, value, onChange, emptyText = 'Nothing to choose from yet.' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !e.composedPath().includes(ref.current)) setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open]);
  const shown = options.filter((o) => o.label.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  const set = new Set(value);
  return (
    <div className="wv-pick" ref={ref}>
      <button type="button" className={`wv-btn wv-btn-quiet${value.length ? ' wv-btn-active' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        {value.length ? <span className="wv-count">{value.length}</span> : null}
        <Chevron />
      </button>
      {open && (
        <div className="wv-pop" role="dialog" aria-label={label} onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}>
          {options.length > 8 && <input className="wv-input" type="search" placeholder={`Search ${label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}
          <div className="wv-pop-list">
            {!options.length && <p className="wv-muted">{emptyText}</p>}
            {shown.map((o) => (
              <label key={o.value} className="wv-check">
                <input type="checkbox" checked={set.has(o.value)} onChange={() => onChange(set.has(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value])} />
                <span>{o.label}</span>
                {o.count != null && <span className="wv-muted wv-num">{o.count}</span>}
              </label>
            ))}
          </div>
          {value.length > 0 && (
            <button type="button" className="wv-link" onClick={() => onChange([])}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------- virtual table ----------

/**
 * Renders only visible rows, so 10,000+ contacts stay fast.
 * columns: [{ id, label, width (CSS grid track), render(row) }]
 */
export function VirtualTable({ rows, columns, rowKey, selected, onToggle, onToggleMany, rowHeight = 52, empty, label }) {
  const ref = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    setScrollTop(0);
  }, [rows]);

  const template = useMemo(() => `44px ${columns.map((c) => c.width || '1fr').join(' ')}`, [columns]);
  const overscan = 8;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(rows.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const selectedHere = keys.reduce((n, k) => n + (selected.has(k) ? 1 : 0), 0);
  const allOn = rows.length > 0 && selectedHere === rows.length;

  return (
    <div className="wv-table" role="table" aria-label={label} aria-rowcount={rows.length}>
      <div className="wv-tr wv-th" role="row" style={{ gridTemplateColumns: template }}>
        <div role="columnheader" className="wv-td wv-td-check">
          <input
            type="checkbox"
            aria-label={allOn ? 'Unselect all rows' : 'Select all rows'}
            checked={allOn}
            ref={(el) => {
              if (el) el.indeterminate = selectedHere > 0 && !allOn;
            }}
            onChange={() => onToggleMany(keys, !allOn)}
          />
        </div>
        {columns.map((c) => (
          <div key={c.id} role="columnheader" className="wv-td">
            {c.label}
          </div>
        ))}
      </div>
      <div className="wv-tbody" ref={ref} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        {!rows.length && <div className="wv-empty">{empty}</div>}
        <div style={{ height: rows.length * rowHeight, position: 'relative' }}>
          {rows.slice(start, end).map((r, i) => {
            const k = keys[start + i];
            const on = selected.has(k);
            return (
              <div
                key={k}
                role="row"
                aria-rowindex={start + i + 1}
                aria-selected={on}
                className={`wv-tr${on ? ' wv-tr-on' : ''}`}
                style={{ gridTemplateColumns: template, height: rowHeight, transform: `translateY(${(start + i) * rowHeight}px)` }}
              >
                <div role="cell" className="wv-td wv-td-check">
                  <input type="checkbox" aria-label="Select row" checked={on} onChange={() => onToggle(k)} />
                </div>
                {columns.map((c) => (
                  <div key={c.id} role="cell" className={`wv-td ${c.className || ''}`}>
                    {c.render(r)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- job progress ----------

export function JobPanel({ title, lines, percent, onCancel, done, onClose, children }) {
  return (
    <div className="wv-modal-backdrop">
      <div className="wv-modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {percent != null && (
          <div className="wv-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
            <span style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
          </div>
        )}
        <div className="wv-job-lines">
          {lines.filter(Boolean).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {children}
        <div className="wv-modal-actions">
          {done ? (
            <button type="button" className="wv-btn wv-btn-primary" onClick={onClose} autoFocus>
              Done
            </button>
          ) : (
            <button type="button" className="wv-btn" onClick={onCancel}>
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const fmtDate = (t) => (t ? new Date(t * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
export const fmtPhone = (p) => (p ? `+${p}` : '');
export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
