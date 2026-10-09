import type { Componente, Ingrediente, Plato, Unidad } from '../data/types';

export const ALERGENOS = [
  'gluten',
  'crustáceos',
  'huevo',
  'pescado',
  'cacahuete',
  'soja',
  'lácteos',
  'frutos de cáscara',
  'apio',
  'mostaza',
  'sésamo',
  'sulfitos',
  'altramuces',
  'moluscos',
] as const;

export interface LineaComponente {
  componente: Componente;
  nombre: string;
  tipo: 'ingrediente' | 'subreceta' | 'desconocido';
  unidad: Unidad | '';
  costeUnitario: number;
  coste: number;
}

export interface PlatoCalc {
  plato: Plato;
  lineas: LineaComponente[];
  coste: number; // coste total de la receta
  costeUnitario: number; // subrecetas: coste por unidad de rendimiento
  pvpSugerido: number; // con IVA
  pvpEfectivo: number; // con IVA (el real si está puesto, si no el sugerido)
  pvpNeto: number; // sin IVA
  foodCostPct: number;
  margen: number; // € por unidad vendida, sin IVA
  margenPct: number;
  alergenos: string[];
  ciclo: boolean;
}

export interface LineaNegocioCalc {
  linea: string;
  platos: number;
  foodCostPct: number;
  pvpMedio: number; // con IVA, ponderado
}

export interface MenuCalc {
  byId: Map<string, PlatoCalc>;
  platos: PlatoCalc[];
  subrecetas: PlatoCalc[];
  porLinea: Map<string, LineaNegocioCalc>;
  costeIngrediente: Map<string, number>;
}

/** Coste por unidad (kg, l o ud) de un ingrediente, teniendo en cuenta la merma. */
export function costeUnitarioIngrediente(i: Ingrediente): number {
  const cant = i.cantidadFormato > 0 ? i.cantidadFormato : 1;
  const merma = Math.min(Math.max(i.mermaPct || 0, 0), 95);
  return (i.precioFormato || 0) / cant / (1 - merma / 100);
}

/** PVP con IVA para alcanzar el food cost objetivo, redondeado hacia arriba a 0,10 €. */
export function pvpSugerido(coste: number, foodCostObjetivoPct: number, ivaPct: number): number {
  if (coste <= 0 || foodCostObjetivoPct <= 0) return 0;
  const neto = coste / (foodCostObjetivoPct / 100);
  return Math.ceil(neto * (1 + ivaPct / 100) * 10 - 1e-9) / 10;
}

export function calcMenu(ingredientes: Ingrediente[], platos: Plato[], componentes: Componente[]): MenuCalc {
  const ingById = new Map(ingredientes.map((i) => [i.id, i]));
  const platoById = new Map(platos.map((p) => [p.id, p]));
  const compsByPlato = new Map<string, Componente[]>();
  for (const c of componentes) {
    const list = compsByPlato.get(c.platoId) ?? [];
    list.push(c);
    compsByPlato.set(c.platoId, list);
  }
  const costeIngrediente = new Map(ingredientes.map((i) => [i.id, costeUnitarioIngrediente(i)]));

  const memo = new Map<string, PlatoCalc>();
  const visiting = new Set<string>();

  const calc = (plato: Plato): PlatoCalc => {
    const cached = memo.get(plato.id);
    if (cached) return cached;
    visiting.add(plato.id);
    let ciclo = false;
    const alergenos = new Set<string>();
    const lineas: LineaComponente[] = (compsByPlato.get(plato.id) ?? []).map((c) => {
      const ing = ingById.get(c.componenteId);
      if (ing) {
        ing.alergenos.forEach((a) => alergenos.add(a));
        const cu = costeIngrediente.get(ing.id) ?? 0;
        return { componente: c, nombre: ing.nombre, tipo: 'ingrediente', unidad: ing.unidad, costeUnitario: cu, coste: cu * (c.cantidad || 0) };
      }
      const sub = platoById.get(c.componenteId);
      if (sub) {
        if (visiting.has(sub.id)) {
          ciclo = true;
          return { componente: c, nombre: sub.nombre, tipo: 'subreceta', unidad: sub.unidadRendimiento, costeUnitario: 0, coste: 0 };
        }
        const sc = calc(sub);
        sc.alergenos.forEach((a) => alergenos.add(a));
        return {
          componente: c,
          nombre: sub.nombre,
          tipo: 'subreceta',
          unidad: sub.unidadRendimiento,
          costeUnitario: sc.costeUnitario,
          coste: sc.costeUnitario * (c.cantidad || 0),
        };
      }
      return { componente: c, nombre: '(no encontrado)', tipo: 'desconocido', unidad: '', costeUnitario: 0, coste: 0 };
    });
    visiting.delete(plato.id);

    const coste = lineas.reduce((s, l) => s + l.coste, 0);
    const costeUnitario = plato.tipo === 'subreceta' ? coste / (plato.rendimiento > 0 ? plato.rendimiento : 1) : coste;
    const sugerido = pvpSugerido(coste, plato.foodCostObjetivoPct, plato.ivaPct);
    const pvpEfectivo = plato.pvp > 0 ? plato.pvp : sugerido;
    const pvpNeto = pvpEfectivo / (1 + (plato.ivaPct || 0) / 100);
    const margen = pvpNeto - coste;
    const result: PlatoCalc = {
      plato,
      lineas,
      coste,
      costeUnitario,
      pvpSugerido: sugerido,
      pvpEfectivo,
      pvpNeto,
      foodCostPct: pvpNeto > 0 ? (coste / pvpNeto) * 100 : 0,
      margen,
      margenPct: pvpNeto > 0 ? (margen / pvpNeto) * 100 : 0,
      alergenos: (ALERGENOS as readonly string[])
        .filter((a) => alergenos.has(a))
        .concat([...alergenos].filter((a) => !(ALERGENOS as readonly string[]).includes(a))),
      ciclo,
    };
    memo.set(plato.id, result);
    return result;
  };

  const all = platos.map(calc);
  const byId = new Map(all.map((p) => [p.plato.id, p]));

  const porLinea = new Map<string, LineaNegocioCalc>();
  const acc = new Map<string, { coste: number; neto: number; bruto: number; peso: number; n: number }>();
  for (const p of all) {
    if (p.plato.tipo !== 'plato' || !p.plato.activo || !p.plato.linea) continue;
    const w = p.plato.peso > 0 ? p.plato.peso : 1;
    const a = acc.get(p.plato.linea) ?? { coste: 0, neto: 0, bruto: 0, peso: 0, n: 0 };
    a.coste += p.coste * w;
    a.neto += p.pvpNeto * w;
    a.bruto += p.pvpEfectivo * w;
    a.peso += w;
    a.n += 1;
    acc.set(p.plato.linea, a);
  }
  for (const [linea, a] of acc) {
    porLinea.set(linea, {
      linea,
      platos: a.n,
      foodCostPct: a.neto > 0 ? (a.coste / a.neto) * 100 : 0,
      pvpMedio: a.peso > 0 ? a.bruto / a.peso : 0,
    });
  }

  return {
    byId,
    platos: all.filter((p) => p.plato.tipo === 'plato'),
    subrecetas: all.filter((p) => p.plato.tipo === 'subreceta'),
    porLinea,
    costeIngrediente,
  };
}
