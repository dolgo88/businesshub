// Fechas como cadenas 'YYYY-MM-DD' y aritmética en días UTC (sin sorpresas de horario de verano).

const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS);
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromDay(toDay(iso) + days);
}

export function diffDays(a: string, b: string): number {
  return toDay(a) - toDay(b);
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 'YYYY-MM' del día dado. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Suma meses a 'YYYY-MM' o 'YYYY-MM-DD' y devuelve 'YYYY-MM'. */
export function addMonths(isoOrMonth: string, months: number): string {
  const [y, m] = isoOrMonth.split('-').map(Number);
  const idx = y * 12 + (m - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

export function monthsBetween(fromMonth: string, toMonth: string): number {
  const [y1, m1] = fromMonth.split('-').map(Number);
  const [y2, m2] = toMonth.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MESES[m - 1]} ${String(y).slice(2)}`;
}

export function monthIndex(month: string): number {
  return Number(month.split('-')[1]) - 1;
}

export function formatDate(iso: string): string {
  if (!iso || !isISODate(iso)) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  if (!iso || !isISODate(iso)) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES_LARGOS[m - 1]} de ${y}`;
}
