import { describe, expect, it } from 'vitest';
import { schedule } from './schedule';
import type { Tarea } from '../data/types';
import { SEED_TAREAS } from '../seed/tareas';

const t = (id: string, duracion: number, dependencias: string[] = [], extra: Partial<Tarea> = {}): Tarea => ({
  id, fase: 'F', nombre: id, responsable: '', duracion, dependencias, inicioFijo: '', hecho: false, fechaHecho: '', notas: '', ...extra,
});

describe('schedule', () => {
  it('encadena dependencias hacia delante desde hoy', () => {
    const r = schedule([t('a', 10), t('b', 5, ['a']), t('kickoff', 0, ['b'])], { today: '2026-10-01', target: '2026-12-01' });
    expect(r.byId.get('a')!.es).toBe('2026-10-01');
    expect(r.byId.get('a')!.ef).toBe('2026-10-11');
    expect(r.byId.get('b')!.es).toBe('2026-10-11');
    expect(r.projectedOpening).toBe('2026-10-16');
    expect(r.delayDays).toBeLessThan(0);
  });

  it('calcula la fecha límite hacia atrás y la holgura', () => {
    const r = schedule([t('a', 10), t('b', 5, ['a']), t('c', 2, ['a']), t('kickoff', 0, ['b', 'c'])], {
      today: '2026-10-01',
      target: '2026-10-20',
    });
    // b debe empezar como tarde el 15/10 para llegar el 20/10
    expect(r.byId.get('b')!.ls).toBe('2026-10-15');
    expect(r.byId.get('b')!.slack).toBe(4);
    expect(r.byId.get('c')!.slack).toBe(7);
    // el camino crítico es el de menor holgura: a -> b -> kickoff
    expect(r.criticalPath.map((x) => x.id)).toEqual(['a', 'b', 'kickoff']);
  });

  it('avisa del retraso cuando no se llega al kick-off', () => {
    const r = schedule([t('a', 30), t('kickoff', 0, ['a'])], { today: '2026-10-01', target: '2026-10-21' });
    expect(r.delayDays).toBe(10);
    expect(r.byId.get('a')!.slack).toBe(-10);
    expect(r.byId.get('a')!.critical).toBe(true);
  });

  it('al fijar una fecha, las tareas dependientes se desplazan', () => {
    const base = [t('a', 10, [], { inicioFijo: '2026-11-01' }), t('b', 5, ['a']), t('kickoff', 0, ['b'])];
    const r = schedule(base, { today: '2026-10-01', target: '2026-12-31' });
    expect(r.byId.get('b')!.es).toBe('2026-11-11');
    expect(r.projectedOpening).toBe('2026-11-16');
  });

  it('una fecha fija no puede saltarse sus dependencias', () => {
    const r = schedule([t('a', 10), t('b', 5, ['a'], { inicioFijo: '2026-10-03' })], { today: '2026-10-01', target: '2026-12-31' });
    expect(r.byId.get('b')!.es).toBe('2026-10-11');
    expect(r.byId.get('b')!.fixedConflict).toBe(true);
  });

  it('las tareas hechas quedan congeladas en su fecha real', () => {
    const r = schedule([t('a', 10, [], { hecho: true, fechaHecho: '2026-09-20' }), t('b', 5, ['a'])], {
      today: '2026-10-01',
      target: '2026-12-31',
    });
    expect(r.byId.get('a')!.ef).toBe('2026-09-20');
    expect(r.byId.get('b')!.es).toBe('2026-10-01'); // no puede empezar antes de hoy
    expect(r.done).toBe(1);
  });

  it('detecta dependencias circulares sin romperse', () => {
    const r = schedule([t('a', 3, ['b']), t('b', 3, ['a'])], { today: '2026-10-01', target: '2026-12-31' });
    expect(r.cycle.sort()).toEqual(['a', 'b']);
    expect(r.tasks).toHaveLength(2);
  });

  it('la plantilla de Barcelona no tiene ciclos y termina en el kick-off', () => {
    const r = schedule(SEED_TAREAS, { today: '2026-10-09', target: '2027-04-01' });
    expect(r.cycle).toEqual([]);
    expect(r.byId.get('kickoff')).toBeDefined();
    for (const task of SEED_TAREAS) for (const d of task.dependencias) expect(r.byId.has(d)).toBe(true);
  });
});
