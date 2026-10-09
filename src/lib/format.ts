const eurFormats = new Map<number, Intl.NumberFormat>();
function eurFormat(decimals: number): Intl.NumberFormat {
  let f = eurFormats.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    eurFormats.set(decimals, f);
  }
  return f;
}
const eur0 = eurFormat(0);
const num0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function eur(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  // evita "-0 €" por redondeo
  return eurFormat(decimals).format(Math.abs(n) < 0.5 / 10 ** decimals ? 0 : n);
}

/** Importe abreviado: 285.400 € -> "285 k€". */
export function eurShort(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 0.5) n = 0;
  if (Math.abs(n) >= 1_000_000) return `${num1.format(n / 1_000_000)} M€`;
  if (Math.abs(n) >= 10_000) return `${num0.format(n / 1000)} k€`;
  return eur0.format(n);
}

export function pct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} %`;
}

export function num(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-ES', { maximumFractionDigits: decimals });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sum<T>(items: T[], f: (x: T) => number): number {
  let s = 0;
  for (const it of items) s += f(it) || 0;
  return s;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
