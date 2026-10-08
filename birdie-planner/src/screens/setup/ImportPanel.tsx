import { useState } from 'react';
import { db } from '../../db/db';
import { importRecords, type MergeSummary } from '../../db/actions';
import { RecordTable, type EditableEntry } from '../../components/RecordTable';
import { Banner, Card, Segmented } from '../../components/ui';
import { fmtHcpi } from '../../lib/format';
import { GolfDeApiSource } from '../../lib/import/golfDeApiSource';
import { toRecordEntry, type ParseResult } from '../../lib/import/parser';
import { PasteImportSource } from '../../lib/import/pasteSource';

type Mode = 'pdf' | 'paste';

export function ImportPanel() {
  const [mode, setMode] = useState<Mode>('pdf');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: EditableEntry[]; header: ParseResult['header']; warnings: string[] } | null>(null);
  const [takeHeader, setTakeHeader] = useState(true);
  const [summary, setSummary] = useState<MergeSummary | null>(null);

  const show = (r: ParseResult) => {
    setPreview({ rows: r.entries.map((e) => ({ ...e, include: true })), header: r.header, warnings: r.warnings });
    setSummary(null);
  };

  const run = async (fn: () => Promise<ParseResult>) => {
    setBusy(true);
    setError(null);
    try {
      show(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    // pdf.js erst bei Bedarf laden
    void run(async () => (await import('../../lib/import/pdfSource')).PdfImportSource.load(file));
  };

  const commit = async () => {
    if (!preview) return;
    const chosen = preview.rows
      .filter((r) => r.include !== false)
      .map(toRecordEntry);
    const s = await importRecords(db, chosen);
    if (takeHeader && preview.header) {
      await db.profile.update('me', { hcpi: preview.header.hcpi, lowHcpi: preview.header.lowHcpi });
    }
    setSummary(s);
    setPreview(null);
    setText('');
  };

  return (
    <Card title="Scoring Record importieren">
      <p className="mb-3 text-sm muted">
        golf.de → „Mein Bereich“ → „Scoring Record“ → „Detailliert“ als PDF speichern und hier hochladen.
        Alles wird nur auf diesem Gerät verarbeitet.
      </p>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'pdf', label: 'PDF hochladen' },
          { value: 'paste', label: PasteImportSource.label },
        ]}
      />
      <div className="mt-3">
        {mode === 'pdf' ? (
          <label className="btn-primary w-full cursor-pointer">
            {busy ? 'Lese PDF …' : 'PDF auswählen'}
            <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        ) : (
          <div className="space-y-2">
            <textarea
              className="h-40 w-full font-mono text-xs"
              placeholder={'HCPI: 22,2  Low HCPI: 22,2\n1  04.10.2026  8812  Herbstpreis  18  Z  98  23.9\nClub: …  PCC: 0\nTees: gelb  Par: 70  CR: 70.6  Slope: 120  HCPI: 22,6  CH: 25  ExSc: 0'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={!text.trim() || busy} onClick={() => void run(() => PasteImportSource.load(text))}>
              Text auswerten
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs muted">
        {GolfDeApiSource.label}. Kein automatischer Login und kein Scraping – Passwörter werden nie gespeichert.
      </p>

      {error && <div className="mt-3"><Banner tone="error">{error}</Banner></div>}
      {summary && (
        <div className="mt-3">
          <Banner tone="ok">
            Übernommen: {summary.added} neu, {summary.updated} aktualisiert, {summary.replaced} Test-/App-Einträge ersetzt,
            {' '}{summary.unchanged} unverändert.
          </Banner>
        </div>
      )}

      {preview && (
        <div className="mt-4 space-y-3">
          <h3 className="font-bold">Vorschau ({preview.rows.length} Einträge) – bitte prüfen</h3>
          {preview.warnings.map((w) => <Banner key={w} tone="warn">{w}</Banner>)}
          {preview.header && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-6 w-6" checked={takeHeader} onChange={(e) => setTakeHeader(e.target.checked)} />
              Profil setzen: HCPI {fmtHcpi(preview.header.hcpi)}, Low HCPI {fmtHcpi(preview.header.lowHcpi)}
            </label>
          )}
          {preview.rows.length > 0 && (
            <RecordTable
              selectable
              rows={preview.rows}
              onChange={(i, patch) =>
                setPreview((p) => p && { ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
              }
            />
          )}
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setPreview(null)}>Verwerfen</button>
            <button
              className="btn-primary flex-1"
              disabled={!preview.rows.some((r) => r.include !== false)}
              onClick={() => void commit()}
            >
              Übernehmen ({preview.rows.filter((r) => r.include !== false).length})
            </button>
          </div>
          <p className="text-xs muted">Merge über Datum + Turnier: vorhandene Einträge werden aktualisiert, nicht doppelt angelegt.</p>
        </div>
      )}
    </Card>
  );
}
