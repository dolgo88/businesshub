import type { GastoFijo, OtraFuente, PartidaInversion, Socio } from '../data/types';
import type { LoanResult } from './loans';
import type { ScheduleResult } from './schedule';
import { addMonths, monthKey } from '../lib/dates';

export const CATEGORIAS_INVERSION = [
  'Local',
  'Legal y licencias',
  'Obras e instalaciones',
  'Maquinaria cocina',
  'Café y barra',
  'Obrador panadería',
  'Mobiliario y menaje',
  'Tecnología',
  'Marca y marketing',
  'Stock y pre-apertura',
];

export function totalPartida(p: PartidaInversion): number {
  return (p.cantidad || 0) * (p.precioUnit || 0);
}

/** Lo que hay que pagar al inicio (sin IVA). Leasing, renting y comodato no requieren desembolso. */
export function desembolsoPartida(p: PartidaInversion): number {
  return p.modo === 'compra' ? totalPartida(p) : 0;
}

export function ivaPartida(p: PartidaInversion): number {
  return desembolsoPartida(p) * ((p.ivaPct || 0) / 100);
}

export interface CategoriaResumen {
  categoria: string;
  sinIva: number;
  conIva: number;
  partidas: number;
}

export interface BudgetSummary {
  porCategoria: CategoriaResumen[];
  inversionSinIva: number;
  ivaInversion: number;
  inversionConIva: number;
  imprevistos: number;
  leasingMensual: number;
  valorComodato: number;
  pagado: number;
  gastosFijosMensual: number;
  gastosFijosMensualConIva: number;
  costeOperativoMensual: number; // fijos + personal + autónomos + leasing (sin IVA)
  fondoManiobra: number;
  totalNecesidades: number;
}

export function summarizeBudget(
  inversion: PartidaInversion[],
  gastos: GastoFijo[],
  opts: { imprevistosPct: number; fondoManiobraMeses: number; personalMensual: number; autonomosMensual: number },
): BudgetSummary {
  const map = new Map<string, CategoriaResumen>();
  for (const p of inversion) {
    const cat = p.categoria || 'Otros';
    const r = map.get(cat) ?? { categoria: cat, sinIva: 0, conIva: 0, partidas: 0 };
    r.sinIva += desembolsoPartida(p);
    r.conIva += desembolsoPartida(p) + ivaPartida(p);
    r.partidas += 1;
    map.set(cat, r);
  }
  const ordered = [
    ...CATEGORIAS_INVERSION.filter((c) => map.has(c)).map((c) => map.get(c)!),
    ...[...map.values()].filter((r) => !CATEGORIAS_INVERSION.includes(r.categoria)),
  ];
  const inversionSinIva = inversion.reduce((s, p) => s + desembolsoPartida(p), 0);
  const ivaInversion = inversion.reduce((s, p) => s + ivaPartida(p), 0);
  const leasingMensual = inversion
    .filter((p) => p.modo === 'leasing' || p.modo === 'renting')
    .reduce((s, p) => s + (p.cuotaMensual || 0), 0);
  const valorComodato = inversion.filter((p) => p.modo === 'comodato').reduce((s, p) => s + totalPartida(p), 0);
  const pagado = inversion.filter((p) => p.estado === 'pagado').reduce((s, p) => s + desembolsoPartida(p) + ivaPartida(p), 0);
  const imprevistos = inversionSinIva * ((opts.imprevistosPct || 0) / 100);
  const gastosFijosMensual = gastos.reduce((s, g) => s + (g.importeMensual || 0), 0);
  const gastosFijosMensualConIva = gastos.reduce((s, g) => s + (g.importeMensual || 0) * (1 + (g.ivaPct || 0) / 100), 0);
  const costeOperativoMensual = gastosFijosMensual + opts.personalMensual + opts.autonomosMensual + leasingMensual;
  const fondoManiobra = costeOperativoMensual * (opts.fondoManiobraMeses || 0);
  return {
    porCategoria: ordered,
    inversionSinIva,
    ivaInversion,
    inversionConIva: inversionSinIva + ivaInversion,
    imprevistos,
    leasingMensual,
    valorComodato,
    pagado,
    gastosFijosMensual,
    gastosFijosMensualConIva,
    costeOperativoMensual,
    fondoManiobra,
    totalNecesidades: inversionSinIva + ivaInversion + imprevistos + fondoManiobra,
  };
}

export interface FinancingSummary {
  necesidades: number;
  propiosDinero: number;
  propiosEspecie: number;
  prestamos: number;
  otras: number;
  totalFuentes: number;
  diferencia: number; // > 0 sobra, < 0 falta
  coberturaPct: number;
  fondosPropiosPct: number;
  participacionTotal: number;
  cuotasMensuales: number;
  sugerencia: { banco: number; socios: number; porSocio: { id: string; nombre: string; importe: number }[] };
}

export function fuenteCuenta(f: OtraFuente): boolean {
  return f.estado !== 'descartado' && f.estado !== 'idea';
}

export function summarizeFinancing(
  necesidades: number,
  socios: Socio[],
  loans: LoanResult[],
  otras: OtraFuente[],
  bancoPct: number,
): FinancingSummary {
  const propiosDinero = socios.reduce((s, x) => s + (x.aportacionDinero || 0), 0);
  const propiosEspecie = socios.reduce((s, x) => s + (x.aportacionEspecie || 0), 0);
  const prestamos = loans.reduce((s, l) => s + (l.prestamo.importe || 0), 0);
  const otrasTotal = otras.filter(fuenteCuenta).reduce((s, f) => s + (f.importe || 0), 0);
  const totalFuentes = propiosDinero + propiosEspecie + prestamos + otrasTotal;
  const participacionTotal = socios.reduce((s, x) => s + (x.participacionPct || 0), 0);
  const necesarioTrasOtras = Math.max(0, necesidades - otrasTotal - propiosEspecie);
  const banco = necesarioTrasOtras * (bancoPct / 100);
  const sociosImporte = necesarioTrasOtras - banco;
  const reparto = participacionTotal > 0 ? participacionTotal : socios.length || 1;
  return {
    necesidades,
    propiosDinero,
    propiosEspecie,
    prestamos,
    otras: otrasTotal,
    totalFuentes,
    diferencia: totalFuentes - necesidades,
    coberturaPct: necesidades > 0 ? (totalFuentes / necesidades) * 100 : 100,
    fondosPropiosPct: totalFuentes > 0 ? ((propiosDinero + propiosEspecie) / totalFuentes) * 100 : 0,
    participacionTotal,
    cuotasMensuales: loans.reduce((s, l) => s + l.cuotaMensual, 0),
    sugerencia: {
      banco,
      socios: sociosImporte,
      porSocio: socios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        importe: (sociosImporte * (participacionTotal > 0 ? s.participacionPct || 0 : 1)) / reparto,
      })),
    },
  };
}

export interface CashNeedMonth {
  month: string;
  importe: number;
  acumulado: number;
}

/** Desembolsos previstos por mes (con IVA) según la fecha de la tarea vinculada a cada partida. */
export function cashNeedsByMonth(inversion: PartidaInversion[], sched: ScheduleResult, kickoff: string): CashNeedMonth[] {
  const defaultMonth = addMonths(monthKey(kickoff), -1);
  const map = new Map<string, number>();
  for (const p of inversion) {
    const amount = desembolsoPartida(p) + ivaPartida(p);
    if (amount <= 0) continue;
    const t = p.tareaId ? sched.byId.get(p.tareaId) : undefined;
    const month = t ? monthKey(t.es) : defaultMonth;
    map.set(month, (map.get(month) ?? 0) + amount);
  }
  const months = [...map.keys()].sort();
  let acc = 0;
  return months.map((m) => {
    acc += map.get(m)!;
    return { month: m, importe: map.get(m)!, acumulado: acc };
  });
}

export interface PhaseCost {
  fase: string;
  coste: number;
  tareas: number;
  hechas: number;
  inicio: string;
  fin: string;
}

export function costByPhase(inversion: PartidaInversion[], sched: ScheduleResult): PhaseCost[] {
  const costByTask = new Map<string, number>();
  for (const p of inversion) {
    if (!p.tareaId) continue;
    costByTask.set(p.tareaId, (costByTask.get(p.tareaId) ?? 0) + desembolsoPartida(p) + ivaPartida(p));
  }
  const phases = new Map<string, PhaseCost>();
  for (const t of sched.tasks) {
    const f = t.fase || 'Sin fase';
    const ph = phases.get(f) ?? { fase: f, coste: 0, tareas: 0, hechas: 0, inicio: t.es, fin: t.ef };
    ph.coste += costByTask.get(t.id) ?? 0;
    ph.tareas += 1;
    if (t.hecho) ph.hechas += 1;
    if (t.es < ph.inicio) ph.inicio = t.es;
    if (t.ef > ph.fin) ph.fin = t.ef;
    phases.set(f, ph);
  }
  return [...phases.values()];
}

export function costByTask(inversion: PartidaInversion[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of inversion) {
    if (!p.tareaId) continue;
    m.set(p.tareaId, (m.get(p.tareaId) ?? 0) + desembolsoPartida(p) + ivaPartida(p));
  }
  return m;
}
