// Minimal stand-in for the WebExtension `browser` API so the dashboard runs as a normal web page (demo only).
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
      for (const [k, v] of Object.entries(obj)) localStorage.setItem(`wv-demo:${k}`, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  },
};

globalThis.browser = {
  storage: { local: store },
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
