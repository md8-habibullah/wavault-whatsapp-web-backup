import { useState } from 'react';
import { buildExport, FORMATS, formatById } from '../lib/export/index.js';
import { toE164 } from '../lib/model.js';
import { copyText, saveFile } from '../lib/download.js';
import { MultiPick, plural, useToast } from './components.jsx';
import { usePref } from './hooks.js';

const GROUPS = [
  ['Spreadsheets', ['csv', 'xlsx']],
  ['Address books', ['vcf3', 'vcf4', 'google', 'outlook']],
  ['Other', ['json', 'txt', 'html', 'pdf']],
];

/**
 * @param {object} p
 * @param {'contacts'|'members'|'groups'} p.kind
 * @param {object[]} p.records       records that will be exported
 * @param {string} p.scopeText       e.g. "633 filtered contacts"
 * @param {object[]} p.columns       all available column definitions
 * @param {string} p.title           file/report title
 * @param {object[]} [p.sheets]      extra xlsx sheets
 * @param {string} p.noun            "contact" | "member" | "group"
 * @param {React.ReactNode} [p.children] extra controls (scope switch etc.)
 */
export default function ExportDock({ kind, records, scopeText, columns, title, sheets, noun, children }) {
  const toast = useToast();
  const peopleOk = kind !== 'groups';
  const [format, setFormat] = usePref(`wv.format.${kind}`, peopleOk ? 'csv' : 'xlsx');
  const [colIds, setColIds] = usePref(`wv.columns.${kind}`, columns.filter((c) => c.default).map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const f = formatById(format) || FORMATS[0];
  const usesColumns = !f.people && f.id !== 'txt';
  const chosen = columns.filter((c) => colIds.includes(c.id));

  const run = async () => {
    if (!records.length) return;
    setBusy(true);
    try {
      const out = buildExport({ kind, records, columns: chosen.length ? chosen : columns.filter((c) => c.default), format: f.id, title, sheets });
      if (f.id === 'pdf') {
        await browser.runtime.sendMessage({ type: 'wavault:print-report', table: out.table });
        toast('Report opened in a new tab. Choose "Save as PDF" in the print dialog.');
      } else {
        const size = saveFile(out.data, out.filename, out.mime);
        toast(`Saved ${out.filename} (${plural(records.length, noun)}, ${(size / 1024).toFixed(size > 10240 ? 0 : 1)} KB).${out.note ? ` ${out.note}` : ''}`);
      }
    } catch (e) {
      toast(`Export failed: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyNumbers = async () => {
    const nums = [...new Set(records.map((r) => toE164(r.phone)).filter(Boolean))];
    const ok = await copyText(nums.join('\n'));
    toast(ok ? `Copied ${plural(nums.length, 'phone number')}.` : 'Copy failed. Use the Numbers list export instead.', ok ? 'ok' : 'error');
  };

  return (
    <div className="wv-dock">
      <div className="wv-dock-scope">
        {children}
        <span className="wv-muted">{scopeText}</span>
      </div>
      <div className="wv-dock-actions">
        <label className="wv-select">
          <span className="wv-sr">Format</span>
          <select value={f.id} onChange={(e) => setFormat(e.target.value)}>
            {GROUPS.map(([label, ids]) => (
              <optgroup key={label} label={label}>
                {ids.map((id) => {
                  const x = formatById(id);
                  return (
                    <option key={id} value={id} disabled={x.people && !peopleOk}>
                      {x.label}: {x.hint}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </label>
        {usesColumns && (
          <MultiPick label="Columns" options={columns.map((c) => ({ value: c.id, label: c.label }))} value={colIds} onChange={(v) => setColIds(v.length ? v : columns.filter((c) => c.default).map((c) => c.id))} />
        )}
        {peopleOk && (
          <button type="button" className="wv-btn wv-btn-quiet" onClick={copyNumbers} disabled={!records.length}>
            Copy numbers
          </button>
        )}
        <button type="button" className="wv-btn wv-btn-primary" onClick={run} disabled={!records.length || busy || (f.people && !peopleOk)}>
          {busy ? 'Exporting…' : `Export ${plural(records.length, noun)}`}
        </button>
      </div>
    </div>
  );
}
