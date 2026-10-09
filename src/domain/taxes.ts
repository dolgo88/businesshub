// Fiscalidad simplificada para socios autónomos de una comunidad de bienes en Cataluña.
// Son estimaciones para planificar: los importes definitivos los debe confirmar la gestoría.

type Escala = [hasta: number, tipoPct: number][];

/** Escala estatal general del IRPF. */
export const ESCALA_IRPF_ESTATAL: Escala = [
  [12_450, 9.5],
  [20_200, 12],
  [35_200, 15],
  [60_000, 18.5],
  [300_000, 22.5],
  [Infinity, 24.5],
];

/** Escala autonómica de Cataluña (vigente desde 2023). */
export const ESCALA_IRPF_CATALUNA: Escala = [
  [12_450, 10.5],
  [17_707.2, 12],
  [21_000, 14],
  [33_007.2, 15],
  [53_407.2, 18.8],
  [90_000, 21.5],
  [120_000, 23.5],
  [175_000, 24.5],
  [Infinity, 25.5],
];

export const MINIMO_PERSONAL = 5_550;

export function cuotaEscala(base: number, escala: Escala): number {
  let cuota = 0;
  let desde = 0;
  for (const [hasta, tipo] of escala) {
    if (base <= desde) break;
    const tramo = Math.min(base, hasta) - desde;
    cuota += (tramo * tipo) / 100;
    desde = hasta;
  }
  return cuota;
}

export interface IrpfResult {
  rendimientoNeto: number;
  gastosDificilJustificacion: number;
  base: number;
  estatal: number;
  autonomico: number;
  total: number;
  tipoMedioPct: number;
}

/**
 * IRPF anual de un socio con rendimientos de actividad económica en estimación directa simplificada
 * (5 % de gastos de difícil justificación, máximo 2.000 €). Sin otras rentas ni deducciones.
 */
export function irpfAnual(rendimientoNeto: number): IrpfResult {
  const rn = Math.max(0, rendimientoNeto);
  const gdj = Math.min(rn * 0.05, 2_000);
  const base = rn - gdj;
  const est = Math.max(0, cuotaEscala(base, ESCALA_IRPF_ESTATAL) - cuotaEscala(Math.min(base, MINIMO_PERSONAL), ESCALA_IRPF_ESTATAL));
  const aut = Math.max(0, cuotaEscala(base, ESCALA_IRPF_CATALUNA) - cuotaEscala(Math.min(base, MINIMO_PERSONAL), ESCALA_IRPF_CATALUNA));
  const total = est + aut;
  return {
    rendimientoNeto: rn,
    gastosDificilJustificacion: gdj,
    base,
    estatal: est,
    autonomico: aut,
    total,
    tipoMedioPct: rn > 0 ? (total / rn) * 100 : 0,
  };
}

/**
 * Tramos de cotización de autónomos (RETA) 2026 por rendimiento neto mensual.
 * Base mínima de cada tramo. Fuente: tablas de la Seguridad Social 2025, prorrogadas en 2026.
 */
export const TRAMOS_RETA_2026: [hasta: number, baseMinima: number][] = [
  [670, 653.59],
  [900, 718.95],
  [1_166.7, 849.67],
  [1_300, 950.98],
  [1_500, 960.78],
  [1_700, 960.78],
  [1_850, 1_143.79],
  [2_030, 1_209.15],
  [2_330, 1_274.51],
  [2_760, 1_356.21],
  [3_190, 1_437.91],
  [3_620, 1_519.61],
  [4_050, 1_601.31],
  [6_000, 1_732.03],
  [Infinity, 1_928.1],
];

/** Tipo total de cotización de autónomos en 2026 (incluye MEI 0,9 %). */
export const TIPO_RETA_PCT = 31.5;

export function cuotaAutonomoPorTramo(rendimientoNetoMensual: number): number {
  const tramo = TRAMOS_RETA_2026.find(([hasta]) => rendimientoNetoMensual <= hasta)!;
  return (tramo[1] * TIPO_RETA_PCT) / 100;
}

export function cuotaAutonomo(
  rendimientoNetoMensual: number,
  mesesDesdeAlta: number,
  opts: { cuotaTarifaPlana: number; mesesTarifaPlana: number },
): number {
  if (mesesDesdeAlta >= 0 && mesesDesdeAlta < opts.mesesTarifaPlana) return opts.cuotaTarifaPlana;
  return cuotaAutonomoPorTramo(rendimientoNetoMensual);
}

export const IVA_TIPOS = [0, 4, 10, 21];
