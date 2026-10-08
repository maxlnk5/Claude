import { FORECAST_LABELS, type Forecast, type ForecastMode } from '../lib/whs';
import { fmtDelta, fmtHcpi } from '../lib/format';

/** HCPI-Prognose für alle drei Annahmen; gewählter Modus hervorgehoben. */
export function ForecastBar({
  forecasts,
  mode,
  onMode,
}: {
  forecasts: Forecast[];
  mode: ForecastMode;
  onMode: (m: ForecastMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Annahme für Restlöcher">
      {forecasts.map((f) => {
        const active = f.mode === mode;
        const better = (f.delta ?? 0) < 0;
        const worse = (f.delta ?? 0) > 0;
        return (
          <button
            key={f.mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onMode(f.mode)}
            className={`rounded-xl border-2 px-2 py-2 text-left ${
              active
                ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-green-950'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <div className="truncate text-xs font-semibold muted">{FORECAST_LABELS[f.mode]}</div>
            <div className="text-2xl font-bold tabular-nums">{fmtHcpi(f.hcpi)}</div>
            <div
              className={`text-sm font-semibold tabular-nums ${
                better ? 'text-green-800 dark:text-green-400' : worse ? 'text-red-700 dark:text-red-400' : 'muted'
              }`}
            >
              {fmtDelta(f.delta)}
              {f.exsc !== 0 && <span className="ml-1 text-xs">ExSc {f.exsc}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
