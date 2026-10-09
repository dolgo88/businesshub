import type { ConfigRow } from './types';

export type Escenario = 'pesimista' | 'realista' | 'optimista';

/** Parámetros generales del proyecto (pestaña Config del Sheet: clave / valor). */
export interface Settings {
  nombreNegocio: string;
  concepto: string;
  formaJuridica: string;
  fechaKickoff: string;
  fechaInicioPlan: string; // '' = hoy
  imprevistosPct: number;
  fondoManiobraMeses: number;
  ssEmpresaPct: number;
  objetivoFoodCostPct: number;
  mermaFoodCostPct: number; // merma, invitaciones y comida de personal sobre el food cost teórico
  crecimientoAnualPct: number; // crecimiento de ventas a partir del año 2
  financiacionBancoPct: number;
  ivaComprasPct: number;
  estacionalidad: number[]; // 12 valores (%), enero..diciembre
  rampUp: number[]; // % de ventas los primeros meses (mes 1, 2, ...)
  escenario: Escenario;
  escenarioPesimistaPct: number;
  escenarioOptimistaPct: number;
  cuotaTarifaPlana: number;
  mesesTarifaPlana: number;
  horizonteMeses: number;
  pesoPrecio: number;
  pesoLicencia: number;
  pesoHumos: number;
  pesoPlaUsos: number;
  pesoOficinas: number;
  pesoAfluencia: number;
  pesoVisibilidad: number;
  pesoEstado: number;
}

export const DEFAULT_SETTINGS: Settings = {
  nombreNegocio: 'Nuestro café-panadería',
  concepto:
    'Café de especialidad, bocatas bien pensados (con opción saludable) y pan de masa madre hecho en casa. ' +
    'Take-away de mediodía para la gente que trabaja en oficinas y cenas por la noche.',
  formaJuridica: 'Comunidad de bienes (2 socios autónomos)',
  fechaKickoff: '2027-04-01',
  fechaInicioPlan: '',
  imprevistosPct: 10,
  fondoManiobraMeses: 3,
  ssEmpresaPct: 32,
  objetivoFoodCostPct: 28,
  mermaFoodCostPct: 15,
  crecimientoAnualPct: 3,
  financiacionBancoPct: 70,
  ivaComprasPct: 10,
  estacionalidad: [92, 95, 100, 104, 105, 100, 92, 65, 100, 106, 102, 98],
  rampUp: [55, 65, 75, 85, 92, 100],
  escenario: 'realista',
  escenarioPesimistaPct: 75,
  escenarioOptimistaPct: 120,
  cuotaTarifaPlana: 88.6,
  mesesTarifaPlana: 12,
  horizonteMeses: 36,
  pesoPrecio: 3,
  pesoLicencia: 3,
  pesoHumos: 3,
  pesoPlaUsos: 3,
  pesoOficinas: 2,
  pesoAfluencia: 2,
  pesoVisibilidad: 1,
  pesoEstado: 1,
};

export function settingsFromRows(rows: ConfigRow[]): Settings {
  const map = new Map(rows.map((r) => [r.clave, r.valor]));
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const raw = map.get(key);
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const s = String(raw).trim();
    if (Array.isArray(def)) {
      const nums = s
        .split(/[;|]|,(?=\s*\d)/)
        .map((x) => Number(x.trim().replace(',', '.')))
        .filter((n) => Number.isFinite(n));
      if (nums.length) out[key] = nums;
    } else if (typeof def === 'number') {
      const n = Number(s.replace(',', '.'));
      if (Number.isFinite(n)) out[key] = n;
    } else {
      out[key] = s;
    }
  }
  return out as unknown as Settings;
}

export function settingsToRows(s: Settings): ConfigRow[] {
  return Object.entries(s).map(([clave, v]) => ({
    clave,
    valor: Array.isArray(v) ? v.join(';') : String(v),
  }));
}
