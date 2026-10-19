import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const SECTIONS = [
  { view: 'contacts', label: 'Contacts', hint: 'Filter and export every contact' },
  { view: 'groups', label: 'Groups', hint: 'Group lists and members' },
  { view: 'chats', label: 'Chat backup', hint: 'Messages and media' },
  { view: 'status', label: 'Status', hint: 'Save photos and videos' },
];

function Popup() {
  const [hasTab, setHasTab] = useState(null);

  useEffect(() => {
    browser.tabs.query({ url: 'https://web.whatsapp.com/*' }).then((t) => setHasTab(t.length > 0)).catch(() => setHasTab(false));
  }, []);

  const open = async (view) => {
    await browser.runtime.sendMessage({ type: 'wavault:open-dashboard', view });
    window.close();
  };

  return (
    <main>
      <header>
        <img src="/icon/48.png" alt="" width="32" height="32" />
        <div>
          <h1>WAVault</h1>
          <p>{hasTab === false ? 'Opens WhatsApp Web for you.' : 'Your WhatsApp backup, kept on this computer.'}</p>
        </div>
      </header>
      <nav>
        {SECTIONS.map((s) => (
          <button key={s.view} type="button" onClick={() => open(s.view)}>
            <span>{s.label}</span>
            <small>{s.hint}</small>
          </button>
        ))}
      </nav>
      <footer>Nothing is uploaded. Files are saved by your browser.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Popup />);
