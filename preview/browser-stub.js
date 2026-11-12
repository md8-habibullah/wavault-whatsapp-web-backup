// Minimal stand-in for the WebExtension `browser` API so the dashboard runs as a normal web page (demo only).
const storageListeners = new Set();
const notifyStorage = (changes) => { for (const listener of storageListeners) listener(changes, 'local'); };
const store = {
  async get(key) {
    try {
      const v = localStorage.getItem(`wv-demo:${key}`);
      return v == null ? {} : { [key]: JSON.parse(v) };
    } catch {
      return {};
    }
  },
  async set(obj) {
    try {
      for (const [k, v] of Object.entries(obj)) {
        const oldValue = JSON.parse(localStorage.getItem(`wv-demo:${k}`) ?? 'null');
        localStorage.setItem(`wv-demo:${k}`, JSON.stringify(v));
        notifyStorage({ [k]: { oldValue, newValue: v } });
      }
    } catch {
      /* private mode */
    }
  },
};

window.addEventListener('storage', (event) => {
  if (event.key?.startsWith('wv-demo:')) notifyStorage({ [event.key.slice(8)]: { newValue: event.newValue == null ? undefined : JSON.parse(event.newValue) } });
});

globalThis.browser = {
  storage: { local: store, onChanged: { addListener: fn => storageListeners.add(fn), removeListener: fn => storageListeners.delete(fn) } },
  tabs: { async query() { return [{ id: 1 }]; } },
  runtime: {
    getURL: (p) => p,
    onMessage: { addListener() {}, removeListener() {} },
    async sendMessage(msg) {
      if (msg?.type === 'wavault:print-report') {
        const { REPORT_CSS, reportBody } = await import('../src/lib/export/html-report.js');
        const w = window.open('', '_blank');
        w.document.write(`<!doctype html><title>${msg.table.title}</title><style>${REPORT_CSS}</style>${reportBody(msg.table)}`);
        w.document.close();
        w.print();
      }
      return null;
    },
  },
};
