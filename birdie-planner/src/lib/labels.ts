/** Punkte → Netto-Bezeichnung */
export function netLabel(points: number): string {
  switch (points) {
    case 0: return 'Strich/0 Punkte';
    case 1: return 'Netto-Bogey';
    case 2: return 'Netto-Par';
    case 3: return 'Netto-Birdie';
    case 4: return 'Netto-Eagle';
    default: return points > 4 ? 'Netto-Albatros+' : '';
  }
}

export function strokesLabel(n: number): string {
  if (n === 0) return 'kein Vorgabeschlag';
  if (n === 1) return '1 Vorgabeschlag';
  if (n === -1) return '1 Schlag zurück (Plus)';
  return n > 0 ? `${n} Vorgabeschläge` : `${-n} Schläge zurück (Plus)`;
}

export function pointsLabel(n: number): string {
  return n === 1 ? '1 Punkt' : `${n} Punkte`;
}

/** Kurzform für Tabellen: Punkte → Netto-Ergebnis */
export function netShort(points: number): string {
  return ['Strich', 'Bogey', 'Par', 'Birdie', 'Eagle'][points] ?? 'Albatros';
}
