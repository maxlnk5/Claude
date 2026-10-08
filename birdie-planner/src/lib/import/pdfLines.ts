/** Ein Textschnipsel aus pdf.js mit Position (PDF-Koordinaten, y nach oben). */
export interface PositionedText {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * pdf.js liefert einzelne Textschnipsel. Daraus werden Zeilen: gleiche
 * y-Position (± Toleranz) → eine Zeile, sortiert von oben nach unten und
 * links nach rechts. Zwischen Schnipseln mit Abstand wird ein Leerzeichen
 * eingefügt, damit die Regex Spalten trennen kann.
 */
export function itemsToLines(items: PositionedText[], tolerance = 2.5): string[] {
  const rows: Array<{ y: number; items: PositionedText[] }> = [];
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tolerance);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    const sorted = [...r.items].sort((a, b) => a.x - b.x);
    let line = '';
    let lastEnd: number | null = null;
    for (const it of sorted) {
      if (lastEnd !== null) {
        const gap = it.x - lastEnd;
        line += gap > 0.5 ? ' ' : '';
      }
      line += it.str;
      lastEnd = it.x + it.width;
    }
    return line.replace(/\s+/g, ' ').trim();
  });
}
