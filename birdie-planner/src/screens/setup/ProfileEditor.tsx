import { db } from '../../db/db';
import { useProfile, useRecords } from '../../db/hooks';
import { historySds } from '../../lib/derived';
import { fmtHcpi } from '../../lib/format';
import { indexFromDifferentials } from '../../lib/whs';
import { Banner, Card, DecimalInput, Field } from '../../components/ui';

export function ProfileEditor() {
  const profile = useProfile();
  const records = useRecords();
  if (!profile) return null;
  const computed = records ? indexFromDifferentials(historySds(records)) : null;
  const lowAgeDays = (Date.now() - new Date(profile.lowHcpiDate).getTime()) / 86_400_000;
  return (
    <Card title="Profil">
      <div className="grid grid-cols-2 gap-3">
        <Field label="HCPI" hint="Plus-Handicap als +1,2">
          <DecimalInput plus value={profile.hcpi} onChange={(v) => v !== null && db.profile.update('me', { hcpi: v })} />
        </Field>
        <Field label="Low HCPI (365 Tage)">
          <DecimalInput plus value={profile.lowHcpi} onChange={(v) => v !== null && db.profile.update('me', { lowHcpi: v })} />
        </Field>
        <Field label="Low HCPI vom">
          <input type="date" className="w-full" value={profile.lowHcpiDate} onChange={(e) => db.profile.update('me', { lowHcpiDate: e.target.value })} />
        </Field>
        <Field label="Spielvorgabe-Faktor %">
          <DecimalInput
            value={Math.round(profile.allowance * 100)}
            onChange={(v) => v !== null && v > 0 && v <= 100 && db.profile.update('me', { allowance: v / 100 })}
          />
        </Field>
      </div>
      <div className="mt-3 space-y-2">
        {computed !== null && Math.abs(computed - profile.hcpi) >= 0.05 && (
          <Banner tone="warn">
            Aus dem Scoring Record berechnet: <b>{fmtHcpi(computed)}</b> (Profil: {fmtHcpi(profile.hcpi)}).
            Abweichungen entstehen z. B. durch Caps oder fehlende Einträge.{' '}
            <button className="underline" onClick={() => db.profile.update('me', { hcpi: computed })}>
              Übernehmen
            </button>
          </Banner>
        )}
        {lowAgeDays > 365 && (
          <Banner tone="warn">Der Low HCPI ist älter als 365 Tage – bitte aus dem Scoring Record aktualisieren.</Banner>
        )}
      </div>
    </Card>
  );
}
