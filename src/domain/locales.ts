import type { Local } from '../data/types';
import type { Settings } from '../data/settings';

export const LICENCIAS = ['ninguna', 'bar / cafetería', 'restaurante', 'restaurante con cocina', 'obrador + restaurante'];

export interface LocalScore {
  local: Local;
  costePrimerAnio: number;
  entrada: number; // lo que hay que pagar al firmar (traspaso + fianza + garantía)
  rentaM2: number;
  notas: { precio: number; licencia: number; humos: number; plaUsos: number; oficinas: number; afluencia: number; visibilidad: number; estado: number };
  puntuacion: number; // 0-100
}

export function costePrimerAnio(l: Local): number {
  return (l.renta || 0) * 12 + (l.traspaso || 0) + (l.renta || 0) * ((l.fianzaMeses || 0) + (l.garantiaMeses || 0)) + (l.obrasEstimadas || 0);
}

function notaLicencia(lic: string): number {
  const s = (lic || '').toLowerCase();
  if (s.includes('obrador') || s.includes('cocina')) return 5;
  if (s.includes('restaurante')) return 4;
  if (s.includes('bar') || s.includes('cafeter')) return 3;
  return 1;
}

function notaPlaUsos(v: string): number {
  const s = (v || '').toLowerCase();
  if (s === 'si' || s === 'sí') return 5;
  if (s === 'no') return 0;
  return 2;
}

const clamp5 = (n: number) => Math.min(5, Math.max(0, n || 0));

export function scoreLocales(locales: Local[], s: Settings): LocalScore[] {
  const activos = locales.filter((l) => l.estado !== 'descartado');
  const costes = activos.map(costePrimerAnio);
  const min = Math.min(...costes);
  const max = Math.max(...costes);
  const pesos = {
    precio: s.pesoPrecio,
    licencia: s.pesoLicencia,
    humos: s.pesoHumos,
    plaUsos: s.pesoPlaUsos,
    oficinas: s.pesoOficinas,
    afluencia: s.pesoAfluencia,
    visibilidad: s.pesoVisibilidad,
    estado: s.pesoEstado,
  };
  const sumaPesos = Object.values(pesos).reduce((a, b) => a + Math.max(0, b || 0), 0) || 1;

  return locales.map((l) => {
    const coste = costePrimerAnio(l);
    const precio = activos.length <= 1 || max === min ? 3 : 1 + (4 * (max - coste)) / (max - min);
    const notas = {
      precio: clamp5(precio),
      licencia: notaLicencia(l.licencia),
      humos: l.salidaHumos ? 5 : 1,
      plaUsos: notaPlaUsos(l.plaUsos),
      oficinas: clamp5(l.notaOficinas),
      afluencia: clamp5(l.notaAfluencia),
      visibilidad: clamp5(l.notaVisibilidad),
      estado: clamp5(l.notaEstado),
    };
    const total = (Object.keys(pesos) as (keyof typeof pesos)[]).reduce(
      (acc, k) => acc + Math.max(0, pesos[k] || 0) * notas[k],
      0,
    );
    return {
      local: l,
      costePrimerAnio: coste,
      entrada: (l.traspaso || 0) + (l.renta || 0) * ((l.fianzaMeses || 0) + (l.garantiaMeses || 0)),
      rentaM2: l.m2 > 0 ? l.renta / l.m2 : 0,
      notas,
      puntuacion: l.estado === 'descartado' ? 0 : (total / (sumaPesos * 5)) * 100,
    };
  });
}
