// Print page for "PDF" exports: renders the table and opens the browser's print dialog (Save as PDF).
import { REPORT_CSS, reportBody } from '../../src/lib/export/html-report.js';

(async () => {
  const id = location.hash.slice(1);
  const table = await browser.runtime.sendMessage({ type: 'wavault:get-report', id });
  if (!table) {
    document.getElementById('status').textContent = 'This report has expired. Export it again from WAVault.';
    return;
  }
  document.title = table.title;
  const style = document.createElement('style');
  style.textContent = REPORT_CSS;
  document.head.appendChild(style);
  const doc = new DOMParser().parseFromString(`<body>${reportBody(table)}</body>`, 'text/html');
  document.body.replaceChildren(...[...doc.body.childNodes].map((n) => document.importNode(n, true)));
  // Let layout settle so the first page is complete, then print.
  requestAnimationFrame(() => setTimeout(() => window.print(), 300));
})();
