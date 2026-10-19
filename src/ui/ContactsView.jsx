import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { applyFilter, emptyFilter, FACETS, PRESETS, presetCounts, presetState } from '../lib/filters.js';
import { CONTACT_COLUMNS } from '../lib/export/columns.js';
import ExportDock from './ExportDock.jsx';
import { Badge, fmtDate, fmtPhone, MultiPick, TriState, VirtualTable } from './components.jsx';
import { useSelection } from './hooks.js';

const keyOf = (c) => c.key;

const TABLE_COLUMNS = [
  {
    id: 'name',
    label: 'Name',
    width: 'minmax(170px, 2fr)',
    render: (c) => (
      <div className="wv-namecell">
        <span className="wv-avatar" aria-hidden="true">
          {(c.displayName || '?').replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 1).toUpperCase() || '#'}
        </span>
        <span className="wv-namecell-text">
          <strong>{c.displayName}</strong>
          <small>{[c.pushname && c.pushname !== c.displayName ? `~${c.pushname}` : null, c.businessName && c.businessName !== c.displayName ? c.businessName : null].filter(Boolean).join(', ')}</small>
        </span>
      </div>
    ),
  },
  { id: 'phone', label: 'Phone', width: 'minmax(150px, 1fr)', className: 'wv-num', render: (c) => fmtPhone(c.phone) || <span className="wv-muted">Hidden</span> },
  { id: 'username', label: 'Username', width: 'minmax(80px, 0.8fr)', render: (c) => (c.username ? `@${c.username}` : '') },
  {
    id: 'state',
    label: 'Status',
    width: 'minmax(140px, 1.3fr)',
    render: (c) => (
      <div className="wv-badges">
        {c.isSaved ? <Badge>Saved</Badge> : <Badge tone="amber">Unsaved</Badge>}
        {c.onWhatsApp === false && <Badge tone="amber">Invite</Badge>}
        {c.isBusiness && <Badge tone="jade">Business</Badge>}
        {c.isBlocked && <Badge tone="red">Blocked</Badge>}
      </div>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    width: 'minmax(96px, 0.9fr)',
    render: (c) =>
      c.hasChat ? (
        <span>
          {c.unreadCount > 0 ? <Badge tone="jade">{c.unreadCount} unread</Badge> : 'Read'}
          <small className="wv-muted wv-block">{fmtDate(c.lastChatAt)}</small>
        </span>
      ) : (
        ''
      ),
  },
  { id: 'labels', label: 'Labels and groups', width: 'minmax(110px, 1.4fr)', render: (c) => <span className="wv-clip" title={[...c.labels, ...c.groups].join(', ')}>{[...c.labels, ...c.groups].join(', ')}</span> },
];

export default function ContactsView({ snapshot, contacts }) {
  const [preset, setPreset] = useState('all');
  const [filter, setFilter] = useState(emptyFilter);
  const [refineOpen, setRefineOpen] = useState(false);
  const [scopePref, setScope] = useState('filtered');
  const { selected, toggle, setMany, clear } = useSelection();
  const scope = selected.size ? scopePref : 'filtered';
  const search = useDeferredValue(filter.search);

  const counts = useMemo(() => presetCounts(contacts), [contacts]);
  const filtered = useMemo(() => applyFilter(contacts, { ...filter, search }), [contacts, filter, search]);
  const selectedRecords = useMemo(() => contacts.filter((c) => selected.has(c.key)), [contacts, selected]);
  const records = scope === 'selected' ? selectedRecords : filtered;

  const groupOptions = useMemo(() => {
    const n = new Map();
    for (const c of contacts) for (const g of c.groups) n.set(g, (n.get(g) || 0) + 1);
    return [...n].sort((a, b) => a[0].localeCompare(b[0])).map(([g, count]) => ({ value: g, label: g, count }));
  }, [contacts]);
  const labelOptions = useMemo(() => {
    const n = new Map((snapshot.labels || []).map((l) => [l.name, 0]));
    for (const c of contacts) for (const l of c.labels) n.set(l, (n.get(l) || 0) + 1);
    return [...n].map(([l, count]) => ({ value: l, label: l, count }));
  }, [contacts, snapshot.labels]);

  const pickPreset = useCallback((id) => {
    setPreset(id);
    setFilter((f) => ({ ...f, facets: presetState(id) }));
  }, []);

  const setFacet = (k, v) => {
    setPreset(null);
    setFilter((f) => ({ ...f, facets: { ...f.facets, [k]: v } }));
  };

  const activeFacets = Object.values(filter.facets).filter((v) => v !== 'any').length;
  const presetLabel = PRESETS.find((p) => p.id === preset)?.label || 'Custom filter';
  const title = `contacts ${presetLabel}${filter.search ? ` ${filter.search}` : ''}`.toLowerCase();

  return (
    <div className="wv-view">
      <div className="wv-head">
        <div className="wv-title">
          <h2>Contacts</h2>
          <p>
            <span className="wv-bignum">{filtered.length.toLocaleString()}</span>
            <span className="wv-muted">of {counts.all.toLocaleString()} people, {presetLabel.toLowerCase()}</span>
          </p>
        </div>
        <input
          className="wv-input wv-search"
          type="search"
          placeholder="Search name, number, @username, label"
          aria-label="Search contacts"
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      <div className="wv-split">
        <nav className="wv-presets" aria-label="Contact lists">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={preset === p.id ? 'on' : ''} aria-pressed={preset === p.id} onClick={() => pickPreset(p.id)}>
              <span>{p.label}</span>
              <span className="wv-num">{(counts[p.id] ?? 0).toLocaleString()}</span>
            </button>
          ))}
        </nav>

        <div className="wv-tablecol">
          <div className="wv-toolbar">
            <button type="button" className={`wv-btn wv-btn-quiet${activeFacets ? ' wv-btn-active' : ''}`} aria-expanded={refineOpen} onClick={() => setRefineOpen((o) => !o)}>
              Refine{activeFacets ? <span className="wv-count">{activeFacets}</span> : null}
            </button>
            <MultiPick label="Groups" options={groupOptions} value={filter.groups} onChange={(v) => setFilter((f) => ({ ...f, groups: v }))} emptyText="No group members loaded. Open the Groups tab to load member lists." />
            <MultiPick label="Labels" options={labelOptions} value={filter.labels} onChange={(v) => setFilter((f) => ({ ...f, labels: v }))} emptyText="No labels. Labels come from WhatsApp Business." />
            <label className="wv-check wv-check-inline">
              <input type="checkbox" checked={!filter.excludeMe} onChange={(e) => setFilter((f) => ({ ...f, excludeMe: !e.target.checked }))} />
              <span>Include me</span>
            </label>
            {(activeFacets > 0 || filter.groups.length > 0 || filter.labels.length > 0 || filter.search) && (
              <button type="button" className="wv-link" onClick={() => { setFilter(emptyFilter()); setPreset('all'); }}>
                Reset filters
              </button>
            )}
          </div>
          {refineOpen && (
            <div className="wv-refine">
              {Object.entries(FACETS).map(([k, f]) => (
                <TriState key={k} label={f.label} value={filter.facets[k]} onChange={(v) => setFacet(k, v)} />
              ))}
            </div>
          )}
          <VirtualTable
            label="Contacts"
            rows={filtered}
            columns={TABLE_COLUMNS}
            rowKey={keyOf}
            selected={selected}
            onToggle={toggle}
            onToggleMany={setMany}
            empty={filter.search ? `No contact matches "${filter.search}".` : 'No contacts in this list.'}
          />
        </div>
      </div>

      <ExportDock kind="contacts" noun="contact" records={records} columns={CONTACT_COLUMNS} title={title} scopeText={scope === 'selected' ? `${selected.size.toLocaleString()} selected` : `${filtered.length.toLocaleString()} in this list`}>
        <div className="wv-seg" role="radiogroup" aria-label="Export which contacts">
          <button type="button" role="radio" aria-checked={scope === 'filtered'} className={scope === 'filtered' ? 'on' : ''} onClick={() => setScope('filtered')}>
            This list
          </button>
          <button type="button" role="radio" aria-checked={scope === 'selected'} className={scope === 'selected' ? 'on' : ''} disabled={!selected.size} onClick={() => setScope('selected')}>
            Selected
          </button>
        </div>
        {selected.size > 0 && (
          <button type="button" className="wv-link" onClick={() => { clear(); setScope('filtered'); }}>
            Clear selection
          </button>
        )}
      </ExportDock>
    </div>
  );
}
