import { useState } from 'react';
import { db } from '../../db/db';
import { useRecords } from '../../db/hooks';
import { RecordTable } from '../../components/RecordTable';
import { Card } from '../../components/ui';
import { sortRecords } from '../../lib/derived';
import { fmtDate, todayIso } from '../../lib/format';
import { confirmDialog } from '../../store/dialog';

/** ManualEditor: Scoring-Record-Einträge von Hand ergänzen und korrigieren. */
export function RecordEditor() {
  const records = useRecords();
  const [open, setOpen] = useState(false);
  if (!records) return null;
  const rows = sortRecords(records).reverse();
  return (
    <Card title={`Scoring Record (${records.length})`}>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => setOpen((o) => !o)}>
          {open ? 'Zuklappen' : 'Bearbeiten'}
        </button>
        <button
          className="btn-secondary flex-1"
          onClick={() => {
            setOpen(true);
            void db.records.add({
              date: todayIso(), tournament: 'Manueller Eintrag', holes: 18, type: 'Z', gbe: null, sd: 0,
              pcc: 0, cr: null, slope: null, par: null, hcpiBefore: null, ch: null, exsc: 0, origin: 'manual',
            });
          }}
        >
          + Eintrag
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <RecordTable
            rows={rows}
            onChange={(i, patch) => {
              const id = rows[i]?.id;
              if (id !== undefined) void db.records.update(id, patch);
            }}
            onDelete={async (i) => {
              const r = rows[i];
              if (r?.id !== undefined && (await confirmDialog(`Eintrag vom ${fmtDate(r.date)} löschen?`))) void db.records.delete(r.id);
            }}
          />
          <p className="mt-2 text-xs muted">Änderungen werden sofort gespeichert. Die letzten 20 SD zählen für den Index.</p>
        </div>
      )}
    </Card>
  );
}
