import { grossForPoints } from './scoring';

export interface PlanInputHole {
  no: number;
  par: number;
  si: number;
  /** Vorgabeschläge (CH) */
  strokes: number;
  /** Bereits erzielte Punkte, undefined = noch nicht gespielt */
  points?: number;
}

export interface PlannedHole {
  no: number;
  par: number;
  si: number;
  strokes: number;
  targetPoints: number;
  targetGross: number;
}

export type PlanMethod = 'stats' | 'heuristic';

export interface HolePlan {
  earned: number;
  remainingNeeded: number;
  remainingHoles: number;
  /** Ø benötigte Punkte pro Restloch */
  avgPerHole: number;
  /** true, wenn das Ziel schon erreicht ist (Rest darf 0 Punkte bringen) */
  done: boolean;
  /** false, wenn das Ziel selbst mit Hole-in-one überall nicht erreichbar ist */
  feasible: boolean;
  /** true, wenn mehr als 4 Punkte auf einem Loch nötig wären */
  unrealistic: boolean;
  method: PlanMethod;
  plan: PlannedHole[];
}

/** Realistische Obergrenze pro Loch (Netto-Eagle). */
const REALISTIC_MAX = 4;

/**
 * Heuristik für "Leichtigkeit" eines Lochs (höher = eher +1 Punkt):
 * Par 5 und Löcher mit Vorgabeschlag zuerst, danach höherer SI (leichter).
 */
export function heuristicEase(h: { par: number; si: number; strokes: number }): number {
  return (h.par === 5 ? 2 : 0) + h.strokes * 1.5 + h.si / 18;
}

/**
 * Persönliche Lochstatistik: Ø Punkte je Loch. Erst ab 3 Runden mit
 * Lochdaten, sonst null (dann greift die Heuristik).
 */
export function computeHoleStats(rounds: Array<Map<number, number>>): Map<number, number> | null {
  if (rounds.length < 3) return null;
  const sum = new Map<number, number>();
  const cnt = new Map<number, number>();
  for (const r of rounds) {
    for (const [no, pts] of r) {
      sum.set(no, (sum.get(no) ?? 0) + pts);
      cnt.set(no, (cnt.get(no) ?? 0) + 1);
    }
  }
  const out = new Map<number, number>();
  for (const [no, s] of sum) out.set(no, s / (cnt.get(no) ?? 1));
  return out;
}

/**
 * Verteilt die noch nötigen Punkte auf die Restlöcher.
 * Basis 2 Punkte (Netto-Par) pro Loch. Mehrpunkte gehen reihum an die
 * leichtesten Löcher, Minderpunkte an die schwersten. "Leicht" kommt aus der
 * persönlichen Statistik (Ø Punkte) oder aus der Heuristik.
 * Nötiger Bruttoschlag = Par + Vorgabeschläge + 2 − Zielpunkte.
 */
export function planHoles(
  holes: PlanInputHole[],
  requiredTotal: number,
  stats: Map<number, number> | null = null,
): HolePlan {
  const earned = holes.reduce((s, h) => s + (h.points ?? 0), 0);
  const remaining = holes.filter((h) => h.points === undefined);
  const remainingNeeded = Math.max(0, requiredTotal - earned);
  const method: PlanMethod = stats ? 'stats' : 'heuristic';
  const ease = (h: PlanInputHole) => (stats ? (stats.get(h.no) ?? 2) : heuristicEase(h));
  // Physisch maximal: Ass = Brutto 1
  const physMax = (h: PlanInputHole) => Math.max(0, h.par + h.strokes + 1);

  const targets = new Map<number, number>(remaining.map((h) => [h.no, 2]));
  let delta = remainingNeeded - 2 * remaining.length;
  const done = requiredTotal - earned <= 0;

  if (done) {
    for (const h of remaining) targets.set(h.no, 0);
    delta = 0;
  }

  const easyFirst = [...remaining].sort((a, b) => ease(b) - ease(a) || a.no - b.no);
  const hardFirst = [...easyFirst].reverse();
  let unrealistic = false;

  const distribute = (cap: (h: PlanInputHole) => number) => {
    let progressed = true;
    while (delta > 0 && progressed) {
      progressed = false;
      for (const h of easyFirst) {
        if (delta <= 0) break;
        const t = targets.get(h.no) ?? 2;
        if (t < cap(h)) {
          targets.set(h.no, t + 1);
          delta--;
          progressed = true;
        }
      }
    }
  };

  if (delta > 0) {
    distribute((h) => Math.min(REALISTIC_MAX, physMax(h)));
    if (delta > 0) {
      unrealistic = true;
      distribute(physMax);
    }
  } else if (delta < 0) {
    let progressed = true;
    while (delta < 0 && progressed) {
      progressed = false;
      for (const h of hardFirst) {
        if (delta >= 0) break;
        const t = targets.get(h.no) ?? 2;
        if (t > 0) {
          targets.set(h.no, t - 1);
          delta++;
          progressed = true;
        }
      }
    }
  }

  const plan = remaining.map((h) => {
    const targetPoints = targets.get(h.no) ?? 2;
    return {
      no: h.no,
      par: h.par,
      si: h.si,
      strokes: h.strokes,
      targetPoints,
      targetGross: grossForPoints(h.par, h.strokes, targetPoints),
    };
  });

  return {
    earned,
    remainingNeeded,
    remainingHoles: remaining.length,
    avgPerHole: remaining.length ? remainingNeeded / remaining.length : 0,
    done,
    feasible: delta <= 0,
    unrealistic,
    method,
    plan,
  };
}
