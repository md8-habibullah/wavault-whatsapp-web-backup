import { useMemo, useRef, useState } from 'react';
import { GROUP_COLUMNS, MEMBER_COLUMNS } from '../lib/export/columns.js';
import { groupMembers } from '../lib/model.js';
import { call } from '../shared/rpc-client.js';
import ExportDock from './ExportDock.jsx';
import { Badge, fmtDate, JobPanel, plural, useToast, VirtualTable } from './components.jsx';
import { useSelection } from './hooks.js';

const keyOf = (g) => g.id;

const TABLE_COLUMNS = [
  {
    id: 'subject',
    label: 'Group',
    width: 'minmax(200px, 2.2fr)',
    render: (g) => (
      <span className="wv-namecell-text">
        <strong>{g.subject || 'Unnamed group'}</strong>
        <small>{g.description ? g.description.split('\n')[0] : ''}</small>
      </span>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    width: 'minmax(90px, 0.7fr)',
    className: 'wv-num',
    render: (g) => (g.participantsLoaded ? g.participants.length.toLocaleString() : <span className="wv-muted" title="Member list not loaded yet">{g.size ? `${g.size} (not loaded)` : 'Not loaded'}</span>),
  },
  {
    id: 'role',
    label: 'My role',
    width: 'minmax(120px, 1fr)',
    render: (g) => (
      <div className="wv-badges">
        {g.iAmAdmin ? <Badge tone="jade">Admin</Badge> : g.iAmMember ? <Badge>Member</Badge> : <Badge tone="amber">Left</Badge>}
        {g.isCommunity && <Badge>Community</Badge>}
      </div>
    ),
  },
  { id: 'created', label: 'Created', width: 'minmax(100px, 0.9fr)', render: (g) => fmtDate(g.createdAt) },
  { id: 'last', label: 'Last activity', width: 'minmax(100px, 0.9fr)', render: (g) => fmtDate(g.lastActivity) },
];

export default function GroupsView({ snapshot, index, mergeGroups }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [what, setWhat] = useState('members');
  const [unique, setUnique] = useState(false);
  const [job, setJob] = useState(null);
  const control = useRef(null);
  const { selected, toggle, setMany } = useSelection();

  const groups = useMemo(
    () => [...snapshot.groups].sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)).filter((g) => !q || (g.subject || '').toLocaleLowerCase().includes(q.toLocaleLowerCase())),
    [snapshot.groups, q],
  );
  const chosen = useMemo(() => snapshot.groups.filter((g) => selected.has(g.id)), [snapshot.groups, selected]);
  const target = chosen.length ? chosen : groups;
  const missing = target.filter((g) => !g.participantsLoaded);

  const members = useMemo(() => {
    const all = target.flatMap((g) => groupMembers(g, index));
    if (!unique) return all;
    const seen = new Map();
    for (const m of all) {
      const prev = seen.get(m.key);
      if (prev) {
        prev.group = `${prev.group}; ${m.group}`;
        if (m.role !== 'Member') prev.role = prev.role === 'Member' ? m.role : prev.role;
      } else seen.set(m.key, { ...m });
    }
    return [...seen.values()];
  }, [target, index, unique]);

  const sheets = useMemo(() => (what === 'members' && !unique && target.length > 1 ? target.map((g) => ({ name: g.subject || g.id, records: groupMembers(g, index) })) : undefined), [what, unique, target, index]);

  const loadMembers = async () => {
    const ids = missing.map((g) => g.id);
    control.current = { cancelled: false };
    setJob({ done: 0, total: ids.length, finished: false });
    const rpc = call('loadGroupParticipants', { groupIds: ids }, { onProgress: (p) => setJob((j) => ({ ...j, ...p })) });
    control.current.cancel = rpc.cancel;
    try {
      const loaded = await rpc.promise;
      mergeGroups(loaded);
      const ok = loaded.filter((g) => g.participantsLoaded).length;
      setJob((j) => ({ ...j, finished: true, result: `Loaded member lists for ${plural(ok, 'group')}.${ok < ids.length ? ` ${ids.length - ok} could not be loaded (you may have left them).` : ''}` }));
    } catch (e) {
      setJob(null);
      toast(`Could not load members: ${e.message}`, 'error');
    }
  };

  return (
    <div className="wv-view">
      <div className="wv-head">
        <div className="wv-title">
          <h2>Groups</h2>
          <p>
            <span className="wv-bignum">{snapshot.groups.length.toLocaleString()}</span>
            <span className="wv-muted">groups, {plural(snapshot.groups.reduce((n, g) => n + g.participants.length, 0), 'member entry', 'member entries')} loaded</span>
          </p>
        </div>
        <input className="wv-input wv-search" type="search" placeholder="Search groups" aria-label="Search groups" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="wv-tablecol wv-tablecol-full">
        {missing.length > 0 && (
          <div className="wv-note">
            <span>{plural(missing.length, 'group')} {chosen.length ? 'you selected' : 'in this list'} {missing.length === 1 ? 'has' : 'have'} no member list loaded yet.</span>
            <button type="button" className="wv-btn wv-btn-quiet" onClick={loadMembers}>
              Load member lists
            </button>
          </div>
        )}
        <VirtualTable label="Groups" rows={groups} columns={TABLE_COLUMNS} rowKey={keyOf} selected={selected} onToggle={toggle} onToggleMany={setMany} empty={q ? `No group matches "${q}".` : 'You are not in any groups.'} />
      </div>

      <ExportDock
        key={what}
        kind={what === 'members' ? 'members' : 'groups'}
        noun={what === 'members' ? 'member' : 'group'}
        records={what === 'members' ? members : target}
        columns={what === 'members' ? MEMBER_COLUMNS : GROUP_COLUMNS}
        title={what === 'members' ? (target.length === 1 ? `group ${target[0].subject || 'members'}` : `group members ${target.length} groups`) : 'groups'}
        sheets={sheets}
        scopeText={`${chosen.length ? `${chosen.length} selected` : 'all'} ${chosen.length === 1 ? 'group' : 'groups'}`}
      >
        <div className="wv-seg" role="radiogroup" aria-label="What to export">
          <button type="button" role="radio" aria-checked={what === 'members'} className={what === 'members' ? 'on' : ''} onClick={() => setWhat('members')}>
            Members
          </button>
          <button type="button" role="radio" aria-checked={what === 'groups'} className={what === 'groups' ? 'on' : ''} onClick={() => setWhat('groups')}>
            Group list
          </button>
        </div>
        {what === 'members' && (
          <label className="wv-check wv-check-inline">
            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
            <span>One row per person</span>
          </label>
        )}
      </ExportDock>

      {job && (
        <JobPanel
          title="Loading member lists"
          percent={job.total ? (job.done / job.total) * 100 : 0}
          lines={[job.finished ? job.result : `${job.done} of ${job.total} groups`]}
          done={job.finished}
          onCancel={() => control.current?.cancel?.()}
          onClose={() => setJob(null)}
        />
      )}
    </div>
  );
}
