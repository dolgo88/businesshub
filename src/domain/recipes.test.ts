import { describe, expect, it } from 'vitest';
import { calcMenu, costeUnitarioIngrediente, pvpSugerido } from './recipes';
import type { Componente, Ingrediente, Plato } from '../data/types';
import { SEED_COMPONENTES, SEED_INGREDIENTES, SEED_PLATOS } from '../seed/menu';

const ing = (id: string, precio: number, cantidad: number, merma = 0, alergenos: string[] = []): Ingrediente => ({
  id, nombre: id, categoria: '', proveedor: '', formato: '', precioFormato: precio, cantidadFormato: cantidad,
  unidad: 'kg', mermaPct: merma, alergenos, ivaPct: 10, notas: '',
});
const plato = (id: string, extra: Partial<Plato> = {}): Plato => ({
  id, nombre: id, tipo: 'plato', categoria: '', linea: 'L', ivaPct: 10, foodCostObjetivoPct: 30, pvp: 0,
  rendimiento: 1, unidadRendimiento: 'ud', peso: 1, activo: true, notas: '', ...extra,
});
const comp = (platoId: string, componenteId: string, cantidad: number): Componente => ({ id: `${platoId}-${componenteId}`, platoId, componenteId, cantidad });

describe('escandallos', () => {
  it('coste por unidad con merma', () => {
    expect(costeUnitarioIngrediente(ing('t', 2.5, 1, 30))).toBeCloseTo(2.5 / 0.7, 6);
    expect(costeUnitarioIngrediente(ing('h', 22, 25))).toBeCloseTo(0.88, 6);
  });

  it('PVP sugerido redondeado hacia arriba a 0,10 €', () => {
    expect(pvpSugerido(1.5, 30, 10)).toBe(5.5);
    expect(pvpSugerido(1.51, 30, 10)).toBe(5.6);
  });

  it('subrecetas, alérgenos y food cost', () => {
    const ings = [ing('harina', 1, 1, 0, ['gluten']), ing('queso', 10, 1, 0, ['lácteos'])];
    const platos = [plato('pan', { tipo: 'subreceta', rendimiento: 2 }), plato('bocata', { pvp: 5.5 })];
    const comps = [comp('pan', 'harina', 1), comp('bocata', 'pan', 1), comp('bocata', 'queso', 0.1)];
    const m = calcMenu(ings, platos, comps);
    const b = m.byId.get('bocata')!;
    expect(m.byId.get('pan')!.costeUnitario).toBeCloseTo(0.5, 6);
    expect(b.coste).toBeCloseTo(1.5, 6);
    expect(b.alergenos).toEqual(['gluten', 'lácteos']);
    expect(b.pvpNeto).toBeCloseTo(5, 6);
    expect(b.foodCostPct).toBeCloseTo(30, 6);
    expect(m.porLinea.get('L')!.foodCostPct).toBeCloseTo(30, 6);
  });

  it('cambiar el precio de un ingrediente recalcula todos los platos que lo usan', () => {
    const ings = [ing('harina', 1, 1)];
    const platos = [plato('pan', { tipo: 'subreceta' }), plato('bocata')];
    const comps = [comp('pan', 'harina', 1), comp('bocata', 'pan', 1)];
    const antes = calcMenu(ings, platos, comps).byId.get('bocata')!.coste;
    const despues = calcMenu([ing('harina', 2, 1)], platos, comps).byId.get('bocata')!.coste;
    expect(despues).toBeCloseTo(antes * 2, 6);
  });

  it('no se cuelga con recetas circulares', () => {
    const platos = [plato('a', { tipo: 'subreceta' }), plato('b', { tipo: 'subreceta' })];
    const m = calcMenu([], platos, [comp('a', 'b', 1), comp('b', 'a', 1)]);
    expect([...m.byId.values()].some((p) => p.ciclo)).toBe(true);
  });

  it('la carta de ejemplo tiene costes y food cost razonables', () => {
    const m = calcMenu(SEED_INGREDIENTES, SEED_PLATOS, SEED_COMPONENTES);
    for (const p of m.platos) {
      expect(p.coste).toBeGreaterThan(0);
      expect(p.foodCostPct).toBeGreaterThan(3);
      expect(p.foodCostPct).toBeLessThan(45);
    }
    expect(m.byId.get('pl-boc-jamon')!.alergenos).toContain('gluten');
  });
});
