import type { Database } from '../data/types';
import { settingsFromRows, type Escenario, type Settings } from '../data/settings';
import { schedule, type ScheduleResult } from '../domain/schedule';
import { amortize, type LoanResult } from '../domain/loans';
import { cobertura, costePersona, type Cobertura, type CostePersona } from '../domain/payroll';
import { calcMenu, type MenuCalc } from '../domain/recipes';
import {
  cashNeedsByMonth,
  costByPhase,
  costByTask,
  summarizeBudget,
  summarizeFinancing,
  type BudgetSummary,
  type CashNeedMonth,
  type FinancingSummary,
  type PhaseCost,
} from '../domain/budget';
import { project, type ProjectionResult } from '../domain/projections';
import { scoreLocales, type LocalScore } from '../domain/locales';
import { isISODate, todayISO } from '../lib/dates';

export interface Derived {
  settings: Settings;
  today: string;
  schedule: ScheduleResult;
  loans: LoanResult[];
  costes: CostePersona[];
  personalMensual: number;
  autonomosMensual: number;
  cobertura: Cobertura;
  menu: MenuCalc;
  budget: BudgetSummary;
  financing: FinancingSummary;
  cashNeeds: CashNeedMonth[];
  phases: PhaseCost[];
  costByTask: Map<string, number>;
  projection: ProjectionResult;
  locales: LocalScore[];
}

export function computeProjection(db: Database, d: Omit<Derived, 'projection' | 'locales'>, escenario: Escenario): ProjectionResult {
  const foodCostPorLinea = new Map([...d.menu.porLinea].map(([k, v]) => [k, v.foodCostPct]));
  return project({
    settings: d.settings,
    escenario,
    franjas: db.Franjas,
    foodCostPorLinea,
    personal: db.Personal,
    costes: d.costes,
    socios: db.Socios,
    gastosFijos: db.GastosFijos,
    inversion: db.Inversion,
    imprevistos: d.budget.imprevistos,
    loans: d.loans,
    otrasFuentes: db.OtrasFuentes,
  });
}

/** Calcula todo lo que se deriva de los datos (todas las páginas leen de aquí). */
export function computeAll(db: Database, today = todayISO()): Derived {
  const settings = settingsFromRows(db.Config);
  const planStart = isISODate(settings.fechaInicioPlan) ? settings.fechaInicioPlan : today;
  const sched = schedule(db.Tareas, { today: planStart, target: settings.fechaKickoff });
  const loans = db.Prestamos.map(amortize);
  const costes = db.Personal.map((p) => costePersona(p, db.Convenio, settings.ssEmpresaPct));
  const personalMensual = costes.reduce((s, c) => s + c.costeEmpresaMensual, 0);
  const autonomosMensual = db.Personal.filter((p) => p.tipo === 'socio').length * settings.cuotaTarifaPlana;
  const menu = calcMenu(db.Ingredientes, db.Platos, db.Componentes);
  const budget = summarizeBudget(db.Inversion, db.GastosFijos, {
    imprevistosPct: settings.imprevistosPct,
    fondoManiobraMeses: settings.fondoManiobraMeses,
    personalMensual,
    autonomosMensual,
  });
  const financing = summarizeFinancing(budget.totalNecesidades, db.Socios, loans, db.OtrasFuentes, settings.financiacionBancoPct);
  const base = {
    settings,
    today,
    schedule: sched,
    loans,
    costes,
    personalMensual,
    autonomosMensual,
    cobertura: cobertura(db.Turnos, db.Personal),
    menu,
    budget,
    financing,
    cashNeeds: cashNeedsByMonth(db.Inversion, sched, settings.fechaKickoff),
    phases: costByPhase(db.Inversion, sched),
    costByTask: costByTask(db.Inversion),
  };
  return {
    ...base,
    projection: computeProjection(db, base, settings.escenario),
    locales: scoreLocales(db.Locales, settings),
  };
}
