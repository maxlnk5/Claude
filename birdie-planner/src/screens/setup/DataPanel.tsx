import { db } from '../../db/db';
import { downloadJson, exportAll } from '../../db/actions';
import { ensureSeed } from '../../db/seed';
import { useRecords } from '../../db/hooks';
import { Card, Field, Segmented } from '../../components/ui';
import { todayIso } from '../../lib/format';
import { useUi, type Theme } from '../../store/ui';

export function DataPanel() {
  const { theme, setTheme } = useUi();
  const records = useRecords();
  const seedCount = records?.filter((r) => r.origin === 'seed').length ?? 0;
  return (
    <Card title="Anzeige & Daten">
      <Field group label="Darstellung" hint="„Hell“ ist bei Sonne am besten lesbar.">
        <Segmented<Theme>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
        />
      </Field>
      <div className="mt-4 grid gap-2">
        <button className="btn-secondary" onClick={async () => downloadJson(`birdie-planner-${todayIso()}.json`, await exportAll(db))}>
          Alle Daten als JSON exportieren
        </button>
        {seedCount > 0 && (
          <button
            className="btn-secondary"
            onClick={() => confirm(`${seedCount} Testdaten-Einträge löschen?`) && void db.records.where('origin').equals('seed').delete()}
          >
            Testdaten entfernen ({seedCount})
          </button>
        )}
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirm('Wirklich ALLE lokalen Daten löschen (Profil, Plätze, Runden, Record)?')) return;
            await Promise.all([db.profile.clear(), db.courses.clear(), db.rounds.clear(), db.records.clear()]);
            await ensureSeed(db);
          }}
        >
          Alles zurücksetzen
        </button>
      </div>
      <p className="mt-3 text-xs muted">
        Alle Daten liegen nur in diesem Browser (IndexedDB). Keine Konten, keine Tracker, keine externen Anfragen.
      </p>
    </Card>
  );
}
