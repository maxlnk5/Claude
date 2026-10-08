import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db/db';
import { deleteRound } from '../db/actions';
import { useCourses, useProfile, useRecords, useRounds } from '../db/hooks';
import { Banner, Card } from '../components/ui';
import { useIsDark } from '../hooks/useIsDark';
import { fmt1, fmtDate, fmtHcpi } from '../lib/format';
import { buildHistory, type HistoryPoint } from '../lib/history';
import { useUi } from '../store/ui';

// Validierte Kategorienfarben (Blau/Orange), je Modus eigene Stufe.
const COLORS = {
  light: { hcpi: '#2a78d6', sd: '#eb6834', surface: '#fcfcfb', grid: '#e5e5e5', text: '#52514e' },
  dark: { hcpi: '#3987e5', sd: '#d95926', surface: '#171717', grid: '#333333', text: '#c3c2b7' },
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow dark:border-neutral-700 dark:bg-neutral-900">
      <div className="font-semibold">{fmtDate(p.date)}</div>
      <div className="max-w-[14rem] truncate muted">{p.entry.tournament}</div>
      <div>SD {fmt1(p.sd)}{p.entry.exsc ? ` (ExSc ${p.entry.exsc})` : ''}</div>
      <div>HCPI danach {fmtHcpi(p.hcpi)}{p.computed ? ' (berechnet)' : ''}</div>
    </div>
  );
}

export function HistoryScreen() {
  const records = useRecords();
  const profile = useProfile();
  const rounds = useRounds();
  const courses = useCourses();
  const dark = useIsDark();
  const { go, viewRound } = useUi();
  if (!records || !profile || !rounds || !courses) return null;

  const c = dark ? COLORS.dark : COLORS.light;
  const points = buildHistory(records, profile.hcpi);
  const finished = rounds.filter((r) => r.status === 'finished');

  return (
    <div className="space-y-4">
      <Card title="HCPI-Verlauf">
        {points.length < 2 ? (
          <Banner tone="info">Noch zu wenige Einträge – Scoring Record im Setup importieren.</Banner>
        ) : (
          <div className="h-72" role="img" aria-label="Verlauf von HCPI und Score Differential je Runde">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => fmtDate(d).slice(3)} tick={{ fill: c.text, fontSize: 12 }} stroke={c.grid} minTickGap={24} />
                <YAxis tick={{ fill: c.text, fontSize: 12 }} stroke={c.grid} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v: number) => Math.round(v).toString()} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.text, strokeDasharray: '3 3' }} />
                <Legend wrapperStyle={{ color: c.text, fontSize: 13 }} />
                <Line
                  name="SD je Runde"
                  dataKey="sd"
                  stroke="none"
                  legendType="circle"
                  isAnimationActive={false}
                  dot={{ r: 4, fill: c.sd, stroke: c.surface, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: c.sd, stroke: c.surface, strokeWidth: 2 }}
                />
                <Line
                  name="HCPI nach Runde"
                  dataKey="hcpi"
                  type="stepAfter"
                  stroke={c.hcpi}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: c.hcpi, stroke: c.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {finished.length > 0 && (
        <Card title="Meine Runden (App)">
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {finished.map((r) => {
              const course = courses.find((x) => x.id === r.courseId);
              return (
                <li key={r.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{fmtDate(r.date)} · {course?.name ?? '?'} {r.tee}</div>
                    <div className="text-sm muted">
                      SD {fmt1(r.sdFinal)} · HCPI {fmtHcpi(r.hcpiBefore)} → {fmtHcpi(r.hcpiAfter)}{r.exsc ? ` · ExSc ${r.exsc}` : ''}
                    </div>
                  </div>
                  <button className="btn-secondary min-h-[44px] px-3 text-sm" onClick={() => { viewRound(r.id ?? null); go('card'); }}>Karte</button>
                  <button
                    className="btn-secondary min-h-[44px] px-3 text-sm"
                    aria-label="Runde löschen"
                    onClick={() => confirm('Runde löschen? Der inoffizielle Record-Eintrag und eine ExSc-Anpassung werden zurückgenommen.') && void deleteRound(db, r)}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title={`Scoring Record (${points.length})`}>
        <p className="mb-2 text-sm muted">Fett = zählt aktuell für den Index (beste SD der letzten 20). Grau = außerhalb der letzten 20.</p>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {[...points].reverse().map((p) => (
            <li key={p.entry.id} className={`flex items-center gap-3 py-2 ${p.inWindow ? '' : 'opacity-50'}`}>
              <div className="w-24 shrink-0 text-sm tabular-nums">{fmtDate(p.date)}</div>
              <div className="min-w-0 flex-1 truncate text-sm">
                {p.entry.tournament}
                {p.entry.holes === 9 && <span className="ml-1 text-xs muted">(9 L.)</span>}
                {(p.entry.origin === 'app' || p.entry.origin === 'seed') && (
                  <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">{p.entry.origin === 'app' ? 'inoffiziell' : 'Testdaten'}</span>
                )}
              </div>
              <div className={`w-12 text-right tabular-nums ${p.counting ? 'font-black' : ''}`}>{fmt1(p.sd)}</div>
              <div className="w-12 text-right text-sm tabular-nums muted">{fmtHcpi(p.hcpi)}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
