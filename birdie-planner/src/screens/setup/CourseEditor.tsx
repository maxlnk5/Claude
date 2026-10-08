import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { useCourses } from '../../db/hooks';
import { placeholderHoles } from '../../db/seed';
import { Banner, Card, DecimalInput, Field, IntInput } from '../../components/ui';
import { checkTee } from '../../lib/derived';
import type { Course, Tee } from '../../lib/types';
import { confirmDialog, noticeDialog } from '../../store/dialog';

export function CourseEditor() {
  const courses = useCourses();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [teeIdx, setTeeIdx] = useState(0);

  useEffect(() => {
    if (courses && courses.length && (courseId === null || !courses.some((c) => c.id === courseId))) {
      setCourseId(courses[0]?.id ?? null);
    }
  }, [courses, courseId]);

  if (!courses) return null;
  const course = courses.find((c) => c.id === courseId);
  const tee = course?.tees[teeIdx] ?? course?.tees[0];

  const saveCourse = (c: Course) => c.id !== undefined && void db.courses.put(c);
  const saveTee = (patch: Partial<Tee>) => {
    if (!course || !tee) return;
    const i = course.tees.indexOf(tee);
    saveCourse({ ...course, tees: course.tees.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  };
  const check = tee ? checkTee(tee) : null;

  return (
    <Card title="Plätze & Tees">
      <div className="flex gap-2">
        <select className="min-w-0 flex-1" value={courseId ?? ''} onChange={(e) => { setCourseId(Number(e.target.value)); setTeeIdx(0); }}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          className="btn-secondary"
          onClick={async () => {
            const id = await db.courses.add({
              name: 'Neuer Platz',
              tees: [{ name: 'gelb', cr: 72, slope: 113, par: 72, holes: placeholderHoles(), holesVerified: false }],
            });
            setCourseId(id);
            setTeeIdx(0);
          }}
        >
          + Platz
        </button>
      </div>

      {course && (
        <div className="mt-3 space-y-3">
          <Field label="Platzname">
            <input className="w-full" value={course.name} onChange={(e) => saveCourse({ ...course, name: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {course.tees.map((t, i) => (
              <button key={i} className={t === tee ? 'btn-primary' : 'btn-secondary'} onClick={() => setTeeIdx(i)}>
                Tee {t.name}
              </button>
            ))}
            <button
              className="btn-secondary"
              onClick={() => {
                saveCourse({
                  ...course,
                  tees: [...course.tees, { ...(tee ?? course.tees[0]!), name: `Tee ${course.tees.length + 1}`, holesVerified: false }],
                });
                setTeeIdx(course.tees.length);
              }}
            >
              + Tee
            </button>
          </div>

          {tee && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tee-Name"><input className="w-full" value={tee.name} onChange={(e) => saveTee({ name: e.target.value })} /></Field>
                <Field label="Par"><IntInput value={tee.par} onChange={(v) => v !== null && saveTee({ par: v })} /></Field>
                <Field label="Course Rating (CR)"><DecimalInput value={tee.cr} onChange={(v) => v !== null && saveTee({ cr: v })} /></Field>
                <Field label="Slope"><IntInput value={tee.slope} min={55} max={155} onChange={(v) => v !== null && saveTee({ slope: v })} /></Field>
              </div>

              {check && !check.ok && (
                <Banner tone="warn">
                  <b>Bitte mit der Scorekarte abgleichen.</b>
                  <ul className="ml-4 list-disc">{check.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                </Banner>
              )}

              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs uppercase muted">
                      <th className="px-1 py-1 text-left">Loch</th>
                      <th className="px-1 py-1">Par</th>
                      <th className="px-1 py-1">SI</th>
                      <th className="px-1 py-1">Länge (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tee.holes.map((h, i) => {
                      const setHole = (patch: Partial<typeof h>) =>
                        saveTee({ holes: tee.holes.map((x, j) => (j === i ? { ...x, ...patch } : x)), holesVerified: false });
                      return (
                        <tr key={h.no}>
                          <td className="px-1 py-1 font-bold tabular-nums">{h.no}</td>
                          <td className="px-1 py-1">
                            <select className="w-full" value={h.par} aria-label={`Par Loch ${h.no}`} onChange={(e) => setHole({ par: Number(e.target.value) })}>
                              {[3, 4, 5, 6].map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <IntInput value={h.si} min={1} max={18} ariaLabel={`SI Loch ${h.no}`} onChange={(v) => v !== null && setHole({ si: v })} />
                          </td>
                          <td className="px-1 py-1">
                            <IntInput value={h.length ?? null} ariaLabel={`Länge Loch ${h.no}`} onChange={(v) => setHole({ length: v ?? undefined })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <label className="flex items-center gap-3 font-semibold">
                <input type="checkbox" className="h-7 w-7" checked={tee.holesVerified} onChange={(e) => saveTee({ holesVerified: e.target.checked })} />
                Par und SI mit der echten Scorekarte abgeglichen
              </label>
              <div className="flex gap-2">
                {course.tees.length > 1 && (
                  <button
                    className="btn-secondary flex-1"
                    onClick={async () => {
                      if (!(await confirmDialog(`Tee ${tee.name} löschen?`))) return;
                      saveCourse({ ...course, tees: course.tees.filter((t) => t !== tee) });
                      setTeeIdx(0);
                    }}
                  >
                    Tee löschen
                  </button>
                )}
                <button
                  className="btn-secondary flex-1"
                  onClick={async () => {
                    if (course.id === undefined || !(await confirmDialog(`Platz ${course.name} löschen?`))) return;
                    if ((await db.rounds.where('courseId').equals(course.id).count()) > 0) {
                      await noticeDialog('Auf diesem Platz gibt es gespeicherte Runden – bitte zuerst die Runden löschen.');
                      return;
                    }
                    await db.courses.delete(course.id);
                  }}
                >
                  Platz löschen
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
