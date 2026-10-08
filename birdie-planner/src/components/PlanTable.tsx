import type { HolePlan } from '../lib/whs';
import { fmt1, pluralLoch } from '../lib/format';
import { netShort } from '../lib/labels';

export function PlanTable({ plan }: { plan: HolePlan }) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold">
        {plan.done
          ? 'Ziel bereits erreicht – der Rest darf 0 Punkte bringen.'
          : `Du brauchst noch ${plan.remainingNeeded} Punkte auf ${pluralLoch(plan.remainingHoles)} = Ø ${fmt1(plan.avgPerHole)} pro Loch`}
      </p>
      <p className="text-xs muted">
        Verteilung nach {plan.method === 'stats' ? 'deiner Lochstatistik (≥ 3 Runden)' : 'Heuristik: Par 5 und Löcher mit Vorgabeschlag eher +1, schwere Löcher eher −1'}.
        {' '}Brutto = Par + Vorgabeschläge + 2 − Zielpunkte.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs uppercase muted">
              <th className="table-cell text-left">Loch</th>
              <th className="table-cell">Par</th>
              <th className="table-cell">SI</th>
              <th className="table-cell">Vg</th>
              <th className="table-cell">Brutto</th>
              <th className="table-cell">Pkt</th>
              <th className="table-cell text-left">Netto</th>
            </tr>
          </thead>
          <tbody>
            {plan.plan.map((h) => (
              <tr key={h.no}>
                <td className="table-cell text-left font-bold">{h.no}</td>
                <td className="table-cell">{h.par}</td>
                <td className="table-cell muted">{h.si}</td>
                <td className="table-cell">{h.strokes}</td>
                <td className="table-cell text-xl font-black">{h.targetGross}</td>
                <td className="table-cell font-semibold">{h.targetPoints}</td>
                <td className="table-cell text-left text-sm">{netShort(h.targetPoints)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!plan.feasible && <p className="font-semibold text-red-700 dark:text-red-400">Mit den Restlöchern nicht erreichbar.</p>}
      {plan.feasible && plan.unrealistic && <p className="font-semibold text-amber-700 dark:text-amber-400">Nur mit mehr als 4 Punkten auf einzelnen Löchern möglich.</p>}
    </div>
  );
}
