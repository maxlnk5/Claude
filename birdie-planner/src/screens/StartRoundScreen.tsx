import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { useActiveRound, useCourses, useProfile } from '../db/hooks';
import { deleteRound } from '../db/actions';
import { Banner, Card, DecimalInput, Field, IntInput, Stat } from '../components/ui';
import { checkTee } from '../lib/derived';
import { fmtHcpi, todayIso } from '../lib/format';
import { courseHandicap, playingHandicap } from '../lib/whs';
import { useUi } from '../store/ui';
import { confirmDialog } from '../store/dialog';

export function StartRoundScreen() {
  const profile = useProfile();
  const courses = useCourses();
  const active = useActiveRound();
  const { go, setHole } = useUi();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [teeName, setTeeName] = useState('');
  const [date, setDate] = useState(todayIso());
  const [pcc, setPcc] = useState<number | null>(0);
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (courses?.length && courseId === null) {
      setCourseId(courses[0]?.id ?? null);
      setTeeName(courses[0]?.tees[0]?.name ?? '');
    }
  }, [courses, courseId]);

  if (!profile || !courses || active === undefined) return null;

  if (active) {
    const course = courses.find((c) => c.id === active.courseId);
    const next = Math.min(active.holes.length, 17);
    return (
      <Card title="Laufende Runde">
        <p className="mb-4">
          {course?.name} · Tee {active.tee} · {active.holes.length} von 18 Löchern erfasst
        </p>
        <div className="grid gap-2">
          <button className="btn-primary min-h-[64px] text-lg" onClick={() => { setHole(next); go('hole'); }}>
            Fortsetzen (Loch {next + 1})
          </button>
          <button
            className="btn-secondary"
            onClick={async () => (await confirmDialog('Laufende Runde verwerfen? Die Eingaben gehen verloren.', 'Verwerfen')) && void deleteRound(db, active)}
          >
            Runde verwerfen
          </button>
        </div>
      </Card>
    );
  }

  const course = courses.find((c) => c.id === courseId);
  const tee = course?.tees.find((t) => t.name === teeName) ?? course?.tees[0];
  const ch = tee ? courseHandicap(profile.hcpi, tee.slope, tee.cr, tee.par) : null;
  const ph = ch !== null ? playingHandicap(ch, profile.allowance) : null;
  const check = tee ? checkTee(tee) : null;

  const start = async () => {
    if (!course?.id || !tee) return;
    await db.rounds.add({
      date,
      courseId: course.id,
      tee: tee.name,
      holes: [],
      pcc: pcc ?? 0,
      targetHcpi: target,
      status: 'active',
      sdFinal: null,
      hcpiBefore: profile.hcpi,
      hcpiAfter: null,
      exsc: 0,
    });
    setHole(0);
    go('hole');
  };

  return (
    <div className="space-y-4">
      <Card title="Runde starten">
        <div className="space-y-3">
          <Field label="Platz">
            <select
              className="w-full"
              value={courseId ?? ''}
              onChange={(e) => {
                const c = courses.find((x) => x.id === Number(e.target.value));
                setCourseId(c?.id ?? null);
                setTeeName(c?.tees[0]?.name ?? '');
              }}
            >
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Tee">
            <select className="w-full" value={tee?.name ?? ''} onChange={(e) => setTeeName(e.target.value)}>
              {course?.tees.map((t) => (
                <option key={t.name} value={t.name}>{t.name} – CR {String(t.cr).replace('.', ',')} / Slope {t.slope} / Par {t.par}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum"><input type="date" className="w-full" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="PCC" hint="meist 0, später korrigierbar"><IntInput value={pcc} min={-1} max={3} onChange={setPcc} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-white p-3 dark:bg-neutral-950">
            <Stat label="HCPI" value={fmtHcpi(profile.hcpi)} />
            <Stat label="Course HCP" value={ch ?? '–'} />
            <Stat label="Spielvorgabe" value={ph ?? '–'} sub={profile.allowance !== 1 ? `${Math.round(profile.allowance * 100)} %` : undefined} />
          </div>
          <Field label="Ziel-HCPI (optional)" hint="Erzeugt einen Lochplan: wie viele Schläge pro Loch nötig sind.">
            <DecimalInput plus value={target} onChange={setTarget} placeholder="z. B. 21,5" />
          </Field>
          <div className="flex flex-wrap gap-2">
            {[0.5, 1, 2].map((d) => (
              <button key={d} className="btn-secondary min-h-[40px] text-sm" onClick={() => setTarget(Math.round((profile.hcpi - d) * 10) / 10)}>
                −{String(d).replace('.', ',')} → {fmtHcpi(Math.round((profile.hcpi - d) * 10) / 10)}
              </button>
            ))}
            {target !== null && <button className="btn-secondary min-h-[40px] text-sm" onClick={() => setTarget(null)}>kein Ziel</button>}
          </div>
        </div>
      </Card>
      {check && !check.ok && (
        <Banner tone="warn">
          <b>Lochdaten prüfen:</b> {check.problems.join(' · ')}. Ohne echte Par-/SI-Werte stimmen Punkte und Plan nicht.
          {' '}<button className="font-semibold underline" onClick={() => go('setup')}>Zum Tee-Editor</button>
        </Banner>
      )}
      <button className="btn-primary min-h-[64px] w-full text-lg" disabled={!tee} onClick={() => void start()}>
        Runde starten
      </button>
    </div>
  );
}
