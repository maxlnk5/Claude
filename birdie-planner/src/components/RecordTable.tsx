import type { RecordType, ScoringRecordEntry } from '../lib/types';
import { DecimalInput, IntInput } from './ui';

const TYPES: RecordType[] = ['Z', 'S', 'H', 'P', 'G'];
const ORIGIN_LABEL: Record<ScoringRecordEntry['origin'], string> = {
  import: 'Import',
  manual: 'manuell',
  app: 'App (inoffiziell)',
  seed: 'Testdaten',
};

export type EditableEntry = ScoringRecordEntry & { include?: boolean; truncated?: boolean; issues?: string[] };

/**
 * Editierbare Tabelle für Scoring-Record-Einträge. Wird für die Import-Vorschau
 * und den manuellen Editor benutzt. Scrollt bei Bedarf horizontal innerhalb
 * der Karte, die Seite selbst bleibt fest.
 */
export function RecordTable({
  rows,
  onChange,
  onDelete,
  selectable = false,
}: {
  rows: EditableEntry[];
  onChange: (index: number, patch: Partial<EditableEntry>) => void;
  onDelete?: (index: number) => void;
  selectable?: boolean;
}) {
  const th = 'px-2 py-2 text-left text-xs font-semibold uppercase muted whitespace-nowrap';
  const num = 'min-w-[4.5rem] px-2 py-1 text-sm';
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {selectable && <th className={th}>✓</th>}
            <th className={th}>Datum</th>
            <th className={th}>Turnier</th>
            <th className={th}>Löcher</th>
            <th className={th}>Art</th>
            <th className={th}>GBE</th>
            <th className={th}>SD</th>
            <th className={th}>PCC</th>
            <th className={th}>CR</th>
            <th className={th}>Slope</th>
            <th className={th}>Par</th>
            <th className={th}>HCPI vor</th>
            <th className={th}>CH</th>
            <th className={th}>ExSc</th>
            <th className={th}>Quelle</th>
            {onDelete && <th className={th} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? `n${i}`} className="border-b border-neutral-200 align-top dark:border-neutral-800">
              {selectable && (
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    className="h-6 w-6"
                    checked={r.include ?? true}
                    aria-label="übernehmen"
                    onChange={(e) => onChange(i, { include: e.target.checked })}
                  />
                </td>
              )}
              <td className="px-1 py-1">
                <input
                  type="date"
                  className="px-2 py-1 text-sm"
                  value={r.date}
                  onChange={(e) => onChange(i, { date: e.target.value })}
                />
              </td>
              <td className="px-1 py-1">
                <input
                  className="min-w-[12rem] px-2 py-1 text-sm"
                  value={r.tournament}
                  onChange={(e) => onChange(i, { tournament: e.target.value })}
                />
                {r.truncated && <div className="text-xs text-amber-700 dark:text-amber-400">Name abgeschnitten</div>}
                {r.issues?.map((m) => (
                  <div key={m} className="text-xs text-amber-700 dark:text-amber-400">{m}</div>
                ))}
              </td>
              <td className="px-1 py-1">
                <select
                  className="px-2 py-1 text-sm"
                  value={r.holes}
                  onChange={(e) => onChange(i, { holes: e.target.value === '9' ? 9 : 18 })}
                >
                  <option value={18}>18</option>
                  <option value={9}>9</option>
                </select>
              </td>
              <td className="px-1 py-1">
                <select
                  className="px-2 py-1 text-sm"
                  value={r.type}
                  onChange={(e) => onChange(i, { type: e.target.value as RecordType })}
                >
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </td>
              <td className="px-1 py-1"><IntInput className={num} value={r.gbe} onChange={(v) => onChange(i, { gbe: v })} ariaLabel="GBE" /></td>
              <td className="px-1 py-1"><DecimalInput className={num} value={r.sd} onChange={(v) => v !== null && onChange(i, { sd: v })} ariaLabel="SD" /></td>
              <td className="px-1 py-1"><IntInput className={num} value={r.pcc} onChange={(v) => onChange(i, { pcc: v ?? 0 })} ariaLabel="PCC" /></td>
              <td className="px-1 py-1"><DecimalInput className={num} value={r.cr} onChange={(v) => onChange(i, { cr: v })} ariaLabel="CR" /></td>
              <td className="px-1 py-1"><IntInput className={num} value={r.slope} onChange={(v) => onChange(i, { slope: v })} ariaLabel="Slope" /></td>
              <td className="px-1 py-1"><IntInput className={num} value={r.par} onChange={(v) => onChange(i, { par: v })} ariaLabel="Par" /></td>
              <td className="px-1 py-1"><DecimalInput plus className={num} value={r.hcpiBefore} onChange={(v) => onChange(i, { hcpiBefore: v })} ariaLabel="HCPI vorher" /></td>
              <td className="px-1 py-1"><IntInput className={num} value={r.ch} onChange={(v) => onChange(i, { ch: v })} ariaLabel="CH" /></td>
              <td className="px-1 py-1"><IntInput className={num} value={r.exsc} onChange={(v) => onChange(i, { exsc: v ?? 0 })} ariaLabel="ExSc" /></td>
              <td className="whitespace-nowrap px-2 py-2 text-xs muted">{ORIGIN_LABEL[r.origin]}</td>
              {onDelete && (
                <td className="px-1 py-1">
                  <button type="button" className="btn-secondary min-h-[40px] px-3" aria-label="Eintrag löschen" onClick={() => onDelete(i)}>
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
