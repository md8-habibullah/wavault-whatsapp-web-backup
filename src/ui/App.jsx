import { useEffect, useState } from 'react';
import ContactsView from './ContactsView.jsx';
import GroupsView from './GroupsView.jsx';
import ChatsView from './ChatsView.jsx';
import StatusView from './StatusView.jsx';
import { ToastProvider } from './components.jsx';
import { usePref, useSnapshot, useWhatsAppStatus } from './hooks.js';

const VIEWS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'groups', label: 'Groups' },
  { id: 'chats', label: 'Chats' },
  { id: 'status', label: 'Status' },
];

function useWhatsAppTheme() {
  const read = () => document.body?.classList.contains('dark') || document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(read()));
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <rect x="4" y="4" width="120" height="120" rx="28" fill="#0F7B68" />
      <path d="M64 22c-24.9 0-45 17.4-45 38.9 0 11.2 5.5 21.3 14.3 28.4L28 106l20.6-9.3c4.8 1.3 10 2 15.4 2 24.9 0 45-17.4 45-38.8S88.9 22 64 22z" fill="#F4F7F6" />
      <path d="M64 38v34M47 59l17 17 17-17" fill="none" stroke="#E0A21B" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Waiting({ status }) {
  const text = {
    connecting: ['Connecting to WhatsApp Web', 'This takes a moment after the page loads.'],
    loading: ['WhatsApp is still loading', 'Your chats are downloading. WAVault opens as soon as they are ready.'],
    'logged-out': ['Log in to WhatsApp Web first', 'Scan the QR code with WhatsApp on your phone, then come back here.'],
  }[status.state] || ['Connecting', ''];
  return (
    <div className="wv-waiting">
      {status.state !== 'logged-out' && <div className="wv-spinner" aria-hidden="true" />}
      <h2>{text[0]}</h2>
      <p className="wv-muted">{text[1]}</p>
    </div>
  );
}

function Settings({ theme, setTheme, launcher, setLauncher }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="wv-settings">
      <button type="button" className="wv-rail-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Settings
      </button>
      {open && (
        <div className="wv-pop wv-pop-up" role="dialog" aria-label="Settings">
          <label className="wv-field">
            <span>Theme</span>
            <select className="wv-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="auto">Match WhatsApp</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="wv-check">
            <input type="checkbox" checked={launcher} onChange={(e) => setLauncher(e.target.checked)} />
            <span>Show the WAVault button on WhatsApp</span>
          </label>
          <p className="wv-muted wv-small">WAVault only reads data already in this browser tab. Nothing is uploaded; files are saved by your browser.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(() => /^#wavault/.test(location.hash));
  const [view, setView] = useState(() => /^#wavault=(\w+)/.exec(location.hash)?.[1] || 'contacts');
  const [theme, setTheme] = usePref('wv.theme', 'auto');
  const [launcher, setLauncher] = usePref('wv.launcher', true);
  const waDark = useWhatsAppTheme();
  const status = useWhatsAppStatus(true);
  const ready = status.state === 'ready';
  const { snapshot, contacts, index, error, loading, refresh, mergeGroups } = useSnapshot(ready && open);

  useEffect(() => {
    const onMsg = (msg) => {
      if (msg?.type === 'wavault:open') {
        setOpen(true);
        if (msg.view) setView(msg.view);
      }
    };
    browser.runtime.onMessage.addListener(onMsg);
    if (/^#wavault/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    return () => browser.runtime.onMessage.removeListener(onMsg);
  }, []);


  const dark = theme === 'dark' || (theme === 'auto' && waDark);
  const counts = snapshot ? { contacts: contacts.filter((c) => !c.isMe).length, groups: snapshot.groups.length, chats: snapshot.chats.length } : {};

  return (
    <ToastProvider>
      <div className="wv-root" data-theme={dark ? 'dark' : 'light'}>
        {!open && launcher && (
          <button type="button" className="wv-launcher" onClick={() => setOpen(true)} aria-label="Open WAVault backup" title="WAVault backup">
            <Logo size={34} />
          </button>
        )}
        {open && (
          <div
            className="wv-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="WAVault"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !e.currentTarget.querySelector('.wv-modal')) setOpen(false);
            }}
          >
            <aside className="wv-rail">
              <div className="wv-brand">
                <Logo />
                <span>WAVault</span>
              </div>
              <nav className="wv-tabs" aria-label="Sections">
                {VIEWS.map((v) => (
                  <button key={v.id} type="button" className={view === v.id ? 'on' : ''} aria-current={view === v.id ? 'page' : undefined} onClick={() => setView(v.id)}>
                    <span>{v.label}</span>
                    {counts[v.id] != null && <span className="wv-num">{counts[v.id].toLocaleString()}</span>}
                  </button>
                ))}
              </nav>
              <div className="wv-rail-foot">
                {snapshot && (
                  <button type="button" className="wv-rail-btn" onClick={refresh} disabled={loading}>
                    {loading ? 'Refreshing…' : 'Refresh data'}
                  </button>
                )}
                <Settings theme={theme} setTheme={setTheme} launcher={launcher} setLauncher={setLauncher} />
                <button type="button" className="wv-rail-btn" onClick={() => setOpen(false)}>
                  Close
                </button>
                {status.version && <small className="wv-muted">WhatsApp {status.version}</small>}
              </div>
            </aside>
            <main className="wv-main">
              {!ready && <Waiting status={status} />}
              {ready && error && (
                <div className="wv-waiting">
                  <h2>Could not read WhatsApp data</h2>
                  <p className="wv-muted">{error}</p>
                  <button type="button" className="wv-btn wv-btn-primary" onClick={refresh}>
                    Try again
                  </button>
                </div>
              )}
              {ready && !error && !snapshot && <Waiting status={{ state: 'connecting' }} />}
              {ready && snapshot && (
                <>
                  {snapshot.warnings?.map((w) => (
                    <p key={w} className="wv-note">
                      {w}
                    </p>
                  ))}
                  {view === 'contacts' && <ContactsView snapshot={snapshot} contacts={contacts} />}
                  {view === 'groups' && <GroupsView snapshot={snapshot} index={index} mergeGroups={mergeGroups} />}
                  {view === 'chats' && <ChatsView snapshot={snapshot} index={index} />}
                  {view === 'status' && <StatusView snapshot={snapshot} index={index} />}
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
