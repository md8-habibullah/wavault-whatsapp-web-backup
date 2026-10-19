// Self-contained, printable HTML table (also the source for "Save as PDF").
import { xmlEscape as esc } from './xlsx.js';

export const REPORT_CSS = `
:root{--paper:#F4F7F6;--ink:#17292C;--muted:#5B6E6B;--line:#D3DDDA;--jade:#0F7B68;--amber:#E0A21B}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Bengali",sans-serif}
header{padding:28px 32px 12px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
.meta{color:var(--muted);margin:0}
.tools{padding:0 32px 12px}
.tools input{width:min(420px,100%);padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff}
.wrap{padding:0 32px 32px;overflow-x:auto}
table{border-collapse:collapse;width:100%;background:#fff;border:1px solid var(--line)}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{position:sticky;top:0;background:#E7EFEC;font-weight:600}
tr:nth-child(even) td{background:#FAFCFB}
td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
@media print{
  body{background:#fff;font-size:10.5px}
  header{padding:0 0 8px}.tools{display:none}.wrap{padding:0;overflow:visible}
  th{position:static}tr{break-inside:avoid}
  @page{size:A4 landscape;margin:12mm}
}`;

export function reportBody({ title, subtitle, headers, rows }) {
  const numeric = headers.map((h) => /phone|members|unread|admins/i.test(h));
  return (
    `<header><h1>${esc(title)}</h1><p class="meta">${esc(subtitle || '')}</p></header>` +
    `<div class="wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((v, i) => `<td${numeric[i] ? ' class="num"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('') +
    '</tbody></table></div>'
  );
}

export function toHTMLReport(table) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(table.title)}</title><style>${REPORT_CSS}</style></head><body>
${reportBody(table).replace('<div class="wrap">', '<div class="tools"><input type="search" placeholder="Filter rows" aria-label="Filter rows" id="q"></div><div class="wrap">')}
<script>
document.getElementById('q').addEventListener('input',function(e){var q=e.target.value.toLowerCase();
document.querySelectorAll('tbody tr').forEach(function(tr){tr.style.display=tr.textContent.toLowerCase().indexOf(q)>-1?'':'none'})});
</script></body></html>`;
}
