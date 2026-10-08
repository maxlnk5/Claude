// Testdaten aus der Aufgabenbeschreibung (letzte 20 SD, neueste zuerst).
export const TEST_PROFILE = { hcpi: 22.2, lowHcpi: 22.2 };
export const TEST_TEE = { par: 70, cr: 70.6, slope: 120 };

export const TEST_SDS_NEWEST_FIRST: Array<[string, number]> = [
  ['04.10.2026', 23.9],
  ['17.09.2026', 23.0],
  ['13.09.2026', 20.2],
  ['03.09.2026', 26.7],
  ['29.08.2026', 29.6],
  ['23.08.2026', 21.1],
  ['01.08.2026', 22.0],
  ['18.07.2026', 30.7],
  ['21.06.2026', 24.9],
  ['14.06.2026', 28.6],
  ['06.06.2026', 17.2],
  ['23.05.2026', 26.6],
  ['13.05.2026', 35.4],
  ['10.05.2026', 32.3],
  ['19.04.2026', 35.5],
  ['14.10.2025', 32.6],
  ['12.10.2025', 25.6],
  ['05.10.2025', 45.3],
  ['03.10.2025', 38.5],
  ['30.09.2025', 43.4],
];

/** SD sortiert alt → neu */
export const TEST_HISTORY: number[] = TEST_SDS_NEWEST_FIRST.map(([, sd]) => sd).reverse();
