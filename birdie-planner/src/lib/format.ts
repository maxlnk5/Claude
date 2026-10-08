/** 22.2 → "22,2" */
export function fmt1(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '–';
  return x.toFixed(1).replace('.', ',');
}

/** HCPI-Anzeige: Plus-Handicaps (negativ) mit "+" */
export function fmtHcpi(x: number | null | undefined): string {
  if (x === null || x === undefined) return '–';
  return x < 0 ? `+${fmt1(-x)}` : fmt1(x);
}

/** Differenz mit Vorzeichen: −0,4 / +0,3 / ±0,0 */
export function fmtDelta(x: number | null | undefined): string {
  if (x === null || x === undefined) return '–';
  if (Math.abs(x) < 0.05) return '±0,0';
  return (x > 0 ? '+' : '−') + fmt1(Math.abs(x));
}

/** "2026-10-04" → "04.10.2026" */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

/** Dezimalzahl mit Komma oder Punkt; "+1,2" als Plus-Handicap (negativ), wenn gewünscht. */
export function parseDecimal(s: string, plusIsNegative = false): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '' || !/^[+-]?\d*(\.\d*)?$/.test(t) || t === '.' || t === '+' || t === '-') return null;
  const v = Number.parseFloat(t);
  if (Number.isNaN(v)) return null;
  return plusIsNegative && t.startsWith('+') ? -Math.abs(v) : v;
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function pluralLoch(n: number): string {
  return n === 1 ? '1 Loch' : `${n} Löchern`;
}
