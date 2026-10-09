import type { Prestamo } from '../data/types';
import { addMonths, monthKey, isISODate } from '../lib/dates';

export interface FilaAmortizacion {
  n: number;
  month: string; // YYYY-MM
  cuota: number;
  interes: number;
  amortizacion: number;
  pendiente: number;
}

export interface LoanResult {
  prestamo: Prestamo;
  cuotaMensual: number; // cuota tras la carencia
  cuotaCarencia: number; // cuota (solo intereses) durante la carencia
  filas: FilaAmortizacion[];
  totalIntereses: number;
  totalPagado: number;
  comision: number;
  neto: number; // lo que entra en la cuenta (importe - comisión)
  taePct: number;
}

/** Cuota de un préstamo francés. */
export function cuotaFrancesa(principal: number, tinPct: number, meses: number): number {
  if (meses <= 0 || principal <= 0) return 0;
  const i = tinPct / 100 / 12;
  if (i === 0) return principal / meses;
  return (principal * i) / (1 - Math.pow(1 + i, -meses));
}

/** Tabla de amortización (sistema francés) con carencia de capital opcional. */
export function amortize(p: Prestamo): LoanResult {
  const principal = Math.max(0, p.importe || 0);
  const plazo = Math.max(0, Math.round(p.plazoMeses || 0));
  const carencia = Math.min(Math.max(0, Math.round(p.carenciaMeses || 0)), plazo);
  const i = (p.tinPct || 0) / 100 / 12;
  const start = isISODate(p.fechaInicio) ? monthKey(p.fechaInicio) : '2027-01';
  const filas: FilaAmortizacion[] = [];
  let pendiente = principal;

  for (let n = 1; n <= carencia; n++) {
    const interes = pendiente * i;
    filas.push({ n, month: addMonths(start, n), cuota: interes, interes, amortizacion: 0, pendiente });
  }
  const resto = plazo - carencia;
  const cuota = cuotaFrancesa(principal, p.tinPct || 0, resto);
  for (let k = 1; k <= resto; k++) {
    const n = carencia + k;
    const interes = pendiente * i;
    let amortizacion = cuota - interes;
    if (k === resto) amortizacion = pendiente; // ajusta el redondeo final
    pendiente = Math.max(0, pendiente - amortizacion);
    filas.push({ n, month: addMonths(start, n), cuota: interes + amortizacion, interes, amortizacion, pendiente });
  }

  const totalIntereses = filas.reduce((s, f) => s + f.interes, 0);
  const totalPagado = filas.reduce((s, f) => s + f.cuota, 0);
  const comision = principal * ((p.comisionAperturaPct || 0) / 100);
  const neto = principal - comision;

  return {
    prestamo: p,
    cuotaMensual: cuota,
    cuotaCarencia: carencia > 0 ? principal * i : 0,
    filas,
    totalIntereses,
    totalPagado,
    comision,
    neto,
    taePct: tae(neto, filas.map((f) => f.cuota)),
  };
}

/** TAE aproximada: tasa interna de rentabilidad mensual de los flujos, anualizada. */
export function tae(neto: number, cuotas: number[]): number {
  if (neto <= 0 || cuotas.length === 0) return 0;
  const npv = (r: number) => cuotas.reduce((s, c, k) => s + c / Math.pow(1 + r, k + 1), 0) - neto;
  if (npv(0) <= 0) return 0;
  let lo = 0;
  let hi = 1;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const r = (lo + hi) / 2;
  return (Math.pow(1 + r, 12) - 1) * 100;
}

/** Suma de cuotas, intereses y capital por mes (YYYY-MM) de todos los préstamos. */
export function loanMonthly(loans: LoanResult[]): Map<string, { cuota: number; interes: number; amortizacion: number }> {
  const out = new Map<string, { cuota: number; interes: number; amortizacion: number }>();
  for (const l of loans) {
    for (const f of l.filas) {
      const cur = out.get(f.month) ?? { cuota: 0, interes: 0, amortizacion: 0 };
      cur.cuota += f.cuota;
      cur.interes += f.interes;
      cur.amortizacion += f.amortizacion;
      out.set(f.month, cur);
    }
  }
  return out;
}
