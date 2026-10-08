import { useEffect, useState, type ReactNode } from 'react';
import { parseDecimal } from '../lib/format';

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

type Tone = 'warn' | 'info' | 'error' | 'ok';
const TONES: Record<Tone, string> = {
  warn: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  info: 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
  error: 'border-red-600 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100',
  ok: 'border-green-700 bg-green-50 text-green-950 dark:bg-green-950 dark:text-green-100',
};

export function Banner({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border-l-4 px-3 py-2 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, big = false }: { label: string; value: ReactNode; sub?: ReactNode; big?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide muted">{label}</div>
      <div className={`font-bold tabular-nums ${big ? 'text-4xl' : 'text-2xl'}`}>{value}</div>
      {sub && <div className="text-sm muted">{sub}</div>}
    </div>
  );
}

/**
 * Dezimal-Eingabe mit Komma. Hält den Text lokal, meldet nur gültige Zahlen.
 * plus = true: "+1,2" wird als Plus-Handicap (−1,2) gemeldet.
 */
export function DecimalInput({
  value,
  onChange,
  plus = false,
  className = '',
  ariaLabel,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  plus?: boolean;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const show = (v: number | null) =>
    v === null ? '' : plus && v < 0 ? `+${String(-v).replace('.', ',')}` : String(v).replace('.', ',');
  const [text, setText] = useState(show(value));
  useEffect(() => {
    if (parseDecimal(text, plus) !== value) setText(show(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`w-full tabular-nums ${className}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseDecimal(e.target.value, plus));
      }}
    />
  );
}

export function IntInput({
  value,
  onChange,
  className = '',
  ariaLabel,
  min,
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  ariaLabel?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={ariaLabel}
      min={min}
      max={max}
      className={`w-full tabular-nums ${className}`}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value === '' ? null : Number.parseInt(e.target.value, 10);
        onChange(v === null || Number.isNaN(v) ? null : v);
      }}
    />
  );
}

/** Beschriftetes Feld. group = true für Button-Gruppen (kein <label>, sonst löst ein Tipp auf den Text den ersten Button aus). */
export function Field({ label, children, hint, group = false }: { label: string; children: ReactNode; hint?: ReactNode; group?: boolean }) {
  const body = (
    <>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs muted">{hint}</span>}
    </>
  );
  return group ? <div role="group" aria-label={label}>{body}</div> : <label className="block">{body}</label>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-neutral-200 p-1 dark:bg-neutral-800" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-[44px] flex-1 rounded-lg px-2 text-sm font-semibold ${
            o.value === value
              ? 'bg-white text-neutral-950 shadow dark:bg-neutral-950 dark:text-neutral-50'
              : 'text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Kleine Punkte für Vorgabeschläge (negativ = Plus-Handicap). */
export function StrokeDots({ n }: { n: number }) {
  if (n === 0) return <span className="muted">keiner</span>;
  const dots = Array.from({ length: Math.abs(n) }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-3 w-3 rounded-full ${n > 0 ? 'bg-green-700 dark:bg-green-500' : 'bg-red-600'}`}
    />
  ));
  return <span className="inline-flex items-center gap-1" aria-label={`${n} Vorgabeschläge`}>{dots}</span>;
}

export const DISCLAIMER = 'Inoffiziell – gültig ist nur die Zählkarte bzw. der DGV-Scoring-Record.';
