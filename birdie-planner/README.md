# Birdie Planner ⛳

Mobile-first PWA für die Golfrunde: Score Loch für Loch erfassen, **live den voraussichtlichen
Handicap-Index (HCPI) nach WHS/DGV** sehen und für einen **Ziel-HCPI einen Lochplan** bekommen
("auf Loch 7 brauchst du 5 Schläge = Netto-Par = 2 Punkte").

> **Inoffiziell.** Gültig ist nur die Zählkarte bzw. der DGV-Scoring-Record.

- Läuft komplett im Browser, auch offline (Service Worker, IndexedDB).
- Kein Backend, keine Konten, keine Tracker, keine externen Requests.
- Vite · React · TypeScript (strict) · Tailwind · Zustand · Dexie · vite-plugin-pwa · Vitest · pdf.js · Recharts

## Start

```bash
cd birdie-planner
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (WHS-Logik, Parser, Merge, DB-Aktionen)
npm run typecheck
```

## Build

```bash
npm run build      # Ausgabe in dist/ (statisch, inkl. Service Worker)
npm run preview    # gebauten Stand lokal ansehen
```

Für ein Unterverzeichnis (z. B. GitHub Pages unter `/<repo>/`):
`BASE_PATH=/<repo>/ npm run build`.

## Deploy (statisch)

**Netlify:** Repository verbinden – `birdie-planner/netlify.toml` setzt Build-Befehl, Ausgabeordner
und eine strikte Content-Security-Policy (`connect-src 'self'`).
Bei Netlify als Base Directory `birdie-planner` angeben.

**GitHub Pages:** Unter *Settings → Pages* als Quelle „GitHub Actions“ wählen, dann den Workflow
*„Birdie Planner → GitHub Pages“* (`.github/workflows/birdie-planner-pages.yml`) manuell starten.

Jeder andere statische Hoster geht auch: Inhalt von `dist/` hochladen.
Auf dem Handy: Seite öffnen → „Zum Startbildschirm hinzufügen“.

## Erste Schritte

1. **Setup → Plätze & Tees:** Die Lochdaten (Par/SI) sind beim ersten Start **Platzhalter**.
   Bitte mit der echten Scorekarte abgleichen und den Haken „abgeglichen“ setzen.
2. **Setup → Scoring Record importieren:** golf.de → *Mein Bereich* → *Scoring Record* → *Detailliert*
   als PDF speichern und hochladen (oder Text einfügen). Vorschau prüfen/korrigieren → Übernehmen.
   Die mitgelieferten Beispiel-SD werden dabei für dieselben Daten ersetzt;
   unter *Anzeige & Daten* lassen sie sich auch komplett entfernen.
3. **Runde → Runde starten**, optional mit Ziel-HCPI.

## Fachlogik (`src/lib/whs/`, reine Funktionen)

| Datei | Inhalt |
|---|---|
| `handicap.ts` | Course Handicap `round(HCPI·Slope/113 + CR − Par)`, Spielvorgabe (Faktor), Vorgabeschläge nach SI inkl. CH > 36 und Plus-Handicap (Schläge zurück ab SI 18) |
| `scoring.ts` | Stableford `max(0, 2 + Par + Vg − Brutto)`, Netto-Doppelbogey, AGS (Strich/nicht gespielt = NDB) |
| `differential.ts` | `SD = 113/Slope · (AGS − CR − PCC)`, 1 Dezimale |
| `exceptional.ts` | **Exceptional Score** (−1 ab 7,0, −2 ab 10,0) – wirkt auf die neue Runde **und** die 19 vorherigen SD (so zeigt es der DGV-Record: „SD inklusive aller Anpassungen“) |
| `hcpi.ts` | WHS-Tabelle 3–20 Runden, Rundung (x,x5 auf), Soft Cap (> 3,0 halb), Hard Cap (+5,0), max. 54 |
| `solver.ts` | Ziel-Solver: probiert jedes AGS 40–150 mit der echten Index-Funktion (nicht linear wegen ExSc) |
| `holePlan.ts` | verteilt die nötigen Punkte (Basis 2/Loch) nach persönlicher Lochstatistik (ab 3 Runden) oder Heuristik |
| `forecast.ts` | Live-Prognose für Restlöcher: Netto-Par / mein Schnitt / Aufgabe |

Annahmen, die man kennen sollte:

- `round()` rundet ,5 Richtung +∞ (CH −2,5 → −2; HCPI 19,85 → 19,9).
- Für Index, Solver und Lochplan zählen die Vorgabeschläge nach **Course Handicap**; die angezeigten
  Stableford-Punkte nutzen die **Spielvorgabe** (bei 100 % identisch).
- Soft/Hard Cap greifen erst, wenn ≥ 20 Scores vorliegen.
- 9-Loch-Einträge aus dem Import werden mit ihrem SD unverändert übernommen. Die App erfasst nur 18-Loch-Runden.
- Beim Abschluss mit ExSc werden die 19 vorherigen SD im lokalen Record mit angepasst.
  Löschen der Runde nimmt das zurück. Ein späterer golf.de-Import überschreibt mit den offiziellen Werten.

## Datenquellen (`src/lib/import/`)

Interface `ScoringRecordSource` mit:

- `PdfImportSource` – PDF wird im Browser mit pdf.js gelesen, Text nach y-Position zu Zeilen gruppiert.
- `PasteImportSource` – eingefügter Text, gleicher Parser.
- Manueller Editor – Setup → Scoring Record → Bearbeiten.
- `GolfDeApiSource` – **Stub**. golf.de hat keine öffentliche API und ist per Login und Bot-Schutz
  gesichert. Deshalb gibt es bewusst kein Scraping, keine Passwort-Speicherung und kein Umgehen des
  Bot-Schutzes. Die TODO-Liste im Stub beschreibt, wie ein offizieller DGV-Zugang eingebaut würde.

Der Parser (`parser.ts`) erkennt die Eintragszeile per Regex, sammelt den Block bis zum nächsten Eintrag
und sucht `PCC`, `Tees`, `Par`, `CR`, `Slope`, `HCPI`, `CH` und `ExSc` einzeln. Er kommt damit klar mit
wiederholten Seitenköpfen, abgeschnittenen Turniernamen (`...`, `-…`), fehlender Nr/ClubNr,
Komma oder Punkt als Dezimaltrennzeichen und Plus-Handicaps (`+1,2`).
Merge über Datum + Turnier, ohne Duplikate.

## Struktur

```
src/
  lib/whs/        WHS-Rechenkern + Tests
  lib/import/     Parser, Merge, Quellen + Tests
  lib/            Typen, Formatierung, abgeleitete Werte
  db/             Dexie-Schema, Seed, Aktionen (+ Tests mit fake-indexeddb)
  store/          Zustand (UI-Zustand)
  screens/        Start, Loch, Scorekarte, Ziel, Abschluss, Verlauf, Setup
  components/     UI-Bausteine
```
