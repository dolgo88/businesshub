import { describe, expect, it } from 'vitest';
import { computeAll } from './derived';
import { seedDatabase } from '../seed';
import type { Database } from '../data/types';
import { settingsFromRows, settingsToRows } from '../data/settings';
import { emptyDatabase } from '../data/schema';

const TODAY = '2026-10-09';

function withSettings(db: Database, patch: Record<string, unknown>): Database {
  return { ...db, Config: settingsToRows({ ...settingsFromRows(db.Config), ...patch }) };
}

describe('módulos conectados (datos de ejemplo)', () => {
  const db = seedDatabase();
  const d = computeAll(db, TODAY);

  it('la plantilla de ejemplo avisa de que el 1/4/2027 es justo', () => {
    expect(d.schedule.target).toBe('2027-04-01');
    expect(d.schedule.delayDays).toBeGreaterThan(0);
    expect(d.schedule.criticalPath.map((t) => t.id)).toContain('obras');
  });

  it('las necesidades incluyen inversión, IVA, imprevistos y fondo de maniobra', () => {
    const b = d.budget;
    expect(b.totalNecesidades).toBeCloseTo(b.inversionSinIva + b.ivaInversion + b.imprevistos + b.fondoManiobra, 6);
    expect(b.imprevistos).toBeCloseTo(b.inversionSinIva * 0.1, 6);
    expect(d.financing.necesidades).toBe(b.totalNecesidades);
  });

  it('una partida nueva del presupuesto aparece en el coste de su fase y en las necesidades de financiación', () => {
    const extra = { ...db.Inversion[0], id: 'nueva', categoria: 'Obras e instalaciones', concepto: 'Extra', cantidad: 1, precioUnit: 10000, ivaPct: 21, tareaId: 'obras' };
    const d2 = computeAll({ ...db, Inversion: [...db.Inversion, extra] }, TODAY);
    const fase = (x: typeof d) => x.phases.find((p) => p.fase.includes('Obras'))!.coste;
    expect(fase(d2) - fase(d)).toBeCloseTo(12100, 6);
    expect(d2.financing.necesidades - d.financing.necesidades).toBeCloseTo(12100 + 1000, 6); // + 10 % imprevistos
  });

  it('cambiar el precio de un ingrediente cambia el food cost de las proyecciones', () => {
    const caro = db.Ingredientes.map((i) => (i.id === 'ing-cafe' ? { ...i, precioFormato: i.precioFormato * 3 } : i));
    const d2 = computeAll({ ...db, Ingredientes: caro }, TODAY);
    expect(d2.menu.porLinea.get('Cafetería')!.foodCostPct).toBeGreaterThan(d.menu.porLinea.get('Cafetería')!.foodCostPct);
    expect(d2.projection.years[0].materiaPrima).toBeGreaterThan(d.projection.years[0].materiaPrima);
  });
});

describe('robustez', () => {
  it('con el Sheet vacío no se rompe nada', () => {
    const d = computeAll(emptyDatabase(), TODAY);
    expect(d.schedule.total).toBe(0);
    expect(d.budget.totalNecesidades).toBe(0);
    expect(d.projection.months).toHaveLength(36);
    expect(d.projection.cajaMinima.valor).toBe(0);
    expect(d.menu.platos).toHaveLength(0);
  });
});

describe('proyecciones', () => {
  const db = seedDatabase();
  const p = computeAll(db, TODAY).projection;

  it('36 meses desde el mes del kick-off', () => {
    expect(p.months).toHaveLength(36);
    expect(p.months[0].month).toBe('2027-04');
    expect(p.years).toHaveLength(3);
  });

  it('la caja final = caja inicial + suma de flujos', () => {
    const suma = p.months.reduce((s, m) => s + m.flujo, 0);
    expect(p.months[35].caja).toBeCloseTo(p.cajaInicial + suma, 4);
  });

  it('el IVA y el modelo 130 solo se pagan en enero, abril, julio y octubre (y la renta en junio)', () => {
    for (const m of p.months) {
      const mes = Number(m.month.slice(5));
      if (m.ivaPagado > 0) expect([1, 4, 7, 10]).toContain(mes);
      if (m.irpfPagado !== 0) expect([1, 4, 6, 7, 10]).toContain(mes);
    }
  });

  it('el ramp-up y agosto reducen ventas', () => {
    const abr = p.months[0];
    const sep = p.months[5];
    const ago = p.months[16];
    expect(abr.ventasNetas).toBeLessThan(sep.ventasNetas);
    expect(ago.ventasNetas).toBeLessThan(p.months[17].ventasNetas);
  });

  it('el escenario pesimista vende menos y tarda más en cubrir costes', () => {
    const pes = computeAll(withSettings(db, { escenario: 'pesimista' }), TODAY).projection;
    expect(pes.years[0].ventasNetas).toBeCloseTo(p.years[0].ventasNetas * 0.75, 0);
    expect(pes.years[0].resultado).toBeLessThan(p.years[0].resultado);
  });

  it('una línea que empieza más tarde no vende antes', () => {
    const franjas = db.Franjas.map((f) => (f.id === 'fr-cenas' ? { ...f, mesInicio: 4 } : f));
    const p2 = computeAll({ ...db, Franjas: franjas }, TODAY).projection;
    expect(p2.months[0].ventasNetas).toBeLessThan(p.months[0].ventasNetas);
    expect(p2.months[3].ventasNetas).toBeCloseTo(p.months[3].ventasNetas, 6);
  });

  it('punto de equilibrio y ratios con sentido', () => {
    expect(p.breakEven.ticketsDia).toBeGreaterThan(0);
    expect(p.breakEven.ticketsDia).toBeLessThan(p.breakEven.ticketsDiaPrevistos);
    expect(p.ratiosAnio1.foodCostPct).toBeGreaterThan(15);
    expect(p.ratiosAnio1.foodCostPct).toBeLessThan(40);
    expect(p.socios).toHaveLength(2);
    expect(p.socios[0].porAnio[0].irpf).toBeGreaterThanOrEqual(0);
  });

  it('los socios autónomos pagan tarifa plana el primer año y por tramo después', () => {
    const tarifa = settingsFromRows(db.Config).cuotaTarifaPlana;
    // alta en marzo de 2027: abril es el mes 1 de tarifa plana
    expect(p.months[0].autonomos).toBeCloseTo(2 * tarifa, 6);
    expect(p.months[14].autonomos).toBeGreaterThan(2 * tarifa);
  });
});
