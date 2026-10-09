import type { Tarea } from '../data/types';
import { addDays, diffDays, toDay, fromDay } from '../lib/dates';

export interface ScheduledTask extends Tarea {
  es: string; // inicio más temprano
  ef: string; // fin más temprano
  ls: string; // inicio más tardío para llegar al kick-off
  lf: string; // fin más tardío
  slack: number; // holgura en días (negativa = retrasa el kick-off)
  critical: boolean;
  fixedConflict: boolean; // tiene fecha fija anterior a lo que permiten sus dependencias
}

export interface ScheduleResult {
  tasks: ScheduledTask[];
  byId: Map<string, ScheduledTask>;
  planStart: string;
  target: string;
  projectedOpening: string;
  delayDays: number; // > 0 = el kick-off objetivo no se cumple
  criticalPath: ScheduledTask[];
  cycle: string[]; // ids implicados en dependencias circulares
  done: number;
  total: number;
}

export const KICKOFF_ID = 'kickoff';

/**
 * Planifica las tareas con el método del camino crítico:
 *  - hacia delante (desde hoy) calcula cuándo puede empezar y acabar cada tarea;
 *  - hacia atrás (desde el kick-off) calcula cuándo debe empezar como muy tarde.
 * Las tareas hechas quedan congeladas en su fecha real.
 */
export function schedule(tareas: Tarea[], opts: { today: string; target: string }): ScheduleResult {
  const { today, target } = opts;
  const ids = new Set(tareas.map((t) => t.id));
  const deps = new Map<string, string[]>();
  for (const t of tareas) {
    deps.set(
      t.id,
      Array.from(new Set(t.dependencias)).filter((d) => d !== t.id && ids.has(d)),
    );
  }

  // Orden topológico (Kahn). Si hay ciclos, los nodos restantes se procesan en el orden original
  // ignorando las dependencias que todavía no se han resuelto.
  const indeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const t of tareas) {
    indeg.set(t.id, deps.get(t.id)!.length);
    succ.set(t.id, []);
  }
  for (const t of tareas) for (const d of deps.get(t.id)!) succ.get(d)!.push(t.id);

  const order: string[] = [];
  const queue = tareas.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    seen.add(id);
    for (const s of succ.get(id)!) {
      indeg.set(s, indeg.get(s)! - 1);
      if (indeg.get(s) === 0) queue.push(s);
    }
  }
  const cycle = tareas.filter((t) => !seen.has(t.id)).map((t) => t.id);
  order.push(...cycle);
  const position = new Map(order.map((id, i) => [id, i]));

  const byIdRaw = new Map(tareas.map((t) => [t.id, t]));
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  const conflict = new Map<string, boolean>();
  const todayN = toDay(today);

  for (const id of order) {
    const t = byIdRaw.get(id)!;
    const dur = Math.max(0, Math.round(t.duracion || 0));
    const predEF = deps
      .get(id)!
      .filter((d) => position.get(d)! < position.get(id)!)
      .reduce((mx, d) => Math.max(mx, ef.get(d)!), -Infinity);

    let start: number;
    let end: number;
    let fixedConflict = false;
    if (t.hecho && t.fechaHecho) {
      end = toDay(t.fechaHecho);
      start = end - dur;
    } else if (t.hecho) {
      start = t.inicioFijo ? toDay(t.inicioFijo) : Number.isFinite(predEF) ? predEF : todayN - dur;
      end = Math.min(start + dur, todayN);
      start = Math.min(start, end - dur);
    } else if (t.inicioFijo) {
      const fixed = toDay(t.inicioFijo);
      fixedConflict = Number.isFinite(predEF) && fixed < predEF;
      start = Math.max(fixed, Number.isFinite(predEF) ? predEF : fixed);
      end = start + dur;
    } else {
      start = Math.max(todayN, Number.isFinite(predEF) ? predEF : todayN);
      end = start + dur;
    }
    es.set(id, start);
    ef.set(id, end);
    conflict.set(id, fixedConflict);
  }

  // Pasada hacia atrás desde el kick-off objetivo.
  const targetN = toDay(target);
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const t = byIdRaw.get(id)!;
    const dur = Math.max(0, Math.round(t.duracion || 0));
    const succLS = succ
      .get(id)!
      .filter((s) => position.get(s)! > position.get(id)!)
      .reduce((mn, s) => Math.min(mn, ls.get(s)!), Infinity);
    const finish = Number.isFinite(succLS) ? Math.min(succLS, targetN) : targetN;
    lf.set(id, finish);
    ls.set(id, finish - dur);
  }

  let minSlack = Infinity;
  for (const t of tareas) {
    if (t.hecho) continue;
    minSlack = Math.min(minSlack, ls.get(t.id)! - es.get(t.id)!);
  }

  const tasks: ScheduledTask[] = tareas.map((t) => {
    const slack = ls.get(t.id)! - es.get(t.id)!;
    return {
      ...t,
      es: fromDay(es.get(t.id)!),
      ef: fromDay(ef.get(t.id)!),
      ls: fromDay(ls.get(t.id)!),
      lf: fromDay(lf.get(t.id)!),
      slack,
      critical: !t.hecho && Number.isFinite(minSlack) && slack <= minSlack,
      fixedConflict: conflict.get(t.id)!,
    };
  });
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const kickoff = byId.get(KICKOFF_ID);
  const projectedOpening = kickoff
    ? kickoff.es
    : tasks.reduce((mx, t) => (t.ef > mx ? t.ef : mx), today);

  const criticalPath = tasks.filter((t) => t.critical).sort((a, b) => (a.es < b.es ? -1 : a.es > b.es ? 1 : 0));

  return {
    tasks,
    byId,
    planStart: today,
    target,
    projectedOpening,
    delayDays: diffDays(projectedOpening, target),
    criticalPath,
    cycle,
    done: tareas.filter((t) => t.hecho).length,
    total: tareas.length,
  };
}

/** Fecha propuesta de kick-off realista (la proyectada), o la objetivo si se llega a tiempo. */
export function suggestedKickoff(result: ScheduleResult): string {
  return result.delayDays > 0 ? result.projectedOpening : result.target;
}

/** Desplaza todas las fechas fijas futuras N días (útil para "mover todo el plan"). */
export function shiftFixedDates(tareas: Tarea[], days: number, today: string): Tarea[] {
  return tareas.map((t) =>
    t.inicioFijo && !t.hecho && t.inicioFijo >= today ? { ...t, inicioFijo: addDays(t.inicioFijo, days) } : t,
  );
}
