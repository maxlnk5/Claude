// Rundungsregeln des WHS.
//
// Kaufmännisch: ab ,5 wird aufgerundet (Richtung +∞). Das EPS fängt
// Gleitkomma-Artefakte ab: 158.8 / 8 = 19.849999… soll 19,9 ergeben.
const EPS = 1e-9;

/** Auf eine Dezimale runden, x,x5 wird aufgerundet. */
export function round1(x: number): number {
  const r = Math.floor(x * 10 + 0.5 + EPS) / 10;
  return r === 0 ? 0 : r; // -0 vermeiden
}

/** Auf ganze Zahl runden, ,5 wird aufgerundet (−2,5 → −2). */
export function roundInt(x: number): number {
  const r = Math.floor(x + 0.5 + EPS);
  return r === 0 ? 0 : r;
}
