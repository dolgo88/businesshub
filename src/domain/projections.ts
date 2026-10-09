import type { Franja, GastoFijo, OtraFuente, PartidaInversion, Persona, Socio } from '../data/types';
import type { Settings, Escenario } from '../data/settings';
import type { CostePersona } from './payroll';
import type { LoanResult } from './loans';
import { loanMonthly } from './loans';
import { desembolsoPartida, fuenteCuenta, ivaPartida } from './budget';
import { cuotaAutonomo, irpfAnual } from './taxes';
import { addMonths, isISODate, monthIndex, monthKey, monthsBetween } from '../lib/dates';

export interface ProjectionInput {
  settings: Settings;
  escenario: Escenario;
  franjas: Franja[];
  foodCostPorLinea: Map<string, number>; // % por línea de negocio (del menú)
  personal: Persona[];
  costes: CostePersona[];
  socios: Socio[];
  gastosFijos: GastoFijo[];
  inversion: PartidaInversion[];
  imprevistos: number;
  loans: LoanResult[];
  otrasFuentes: OtraFuente[];
}

export interface MonthRow {
  idx: number; // 1 = mes de apertura
  month: string;
  ventasBrutas: number; // con IVA
  ventasNetas: number;
  tickets: number;
  materiaPrima: number;
  comisiones: number;
  personal: number;
  autonomos: number;
  fijos: number;
  leasing: number;
  ebitda: number;
  amortizacion: number;
  intereses: number;
  resultado: number; // rendimiento neto de la actividad (antes de IRPF)
  capitalPrestamos: number;
  ivaPagado: number; // liquidación trimestral (modelo 303)
  irpfPagado: number; // pagos fraccionados (modelo 130) y regularización anual
  retiradas: number;
  flujo: number;
  caja: number;
}

export interface YearSummary {
  year: number; // 1, 2, 3...
  label: string;
  ventasNetas: number;
  materiaPrima: number;
  comisiones: number;
  personal: number;
  autonomos: number;
  fijos: number;
  leasing: number;
  ebitda: number;
  amortizacion: number;
  intereses: number;
  resultado: number;
  irpf: number;
  beneficioNeto: number;
  flujo: number;
  cajaFinal: number;
}

export interface SocioYear {
  socioId: string;
  nombre: string;
  participacionPct: number;
  porAnio: { year: number; rendimiento: number; irpf: number; neto: number; netoMensual: number; retiradas: number }[];
}

export interface ProjectionResult {
  aperturaMonth: string;
  escenarioPct: number;
  cajaInicial: number;
  desembolsoInicial: number;
  fuentesIniciales: number;
  months: MonthRow[];
  years: YearSummary[];
  cajaMinima: { valor: number; month: string; idx: number };
  primerMesCajaNegativa: MonthRow | null;
  breakEven: { ventasMes: number; ticketsDia: number; ticketsDiaPrevistos: number; pctVentasPrevistas: number };
  paybackMeses: number | null;
  ratiosAnio1: { foodCostPct: number; personalPct: number; alquilerPct: number; primeCostPct: number; ebitdaPct: number };
  socios: SocioYear[];
}

export function escenarioPct(s: Settings, e: Escenario): number {
  if (e === 'pesimista') return s.escenarioPesimistaPct;
  if (e === 'optimista') return s.escenarioOptimistaPct;
  return 100;
}

/** Food cost real de una franja: el teórico del menú (o el objetivo) más la merma y el consumo interno. */
function foodCost(franja: Franja, input: ProjectionInput): number {
  const fc = input.foodCostPorLinea.get(franja.linea);
  const teorico = fc && fc > 0 ? fc : input.settings.objetivoFoodCostPct;
  return (teorico / 100) * (1 + (input.settings.mermaFoodCostPct || 0) / 100);
}

function isAlquiler(g: GastoFijo): boolean {
  return /alquiler|renta/i.test(g.concepto) || /^local$/i.test(g.categoria);
}

const QUARTER_PAYMENT_MONTHS = new Set([0, 3, 6, 9]); // ene, abr, jul, oct (índice 0-11)

export function project(input: ProjectionInput): ProjectionResult {
  const s = input.settings;
  const kickoff = isISODate(s.fechaKickoff) ? s.fechaKickoff : '2027-04-01';
  const aperturaMonth = monthKey(kickoff);
  const n = Math.max(12, Math.round(s.horizonteMeses || 36));
  const factor = escenarioPct(s, input.escenario) / 100;
  const loanByMonth = loanMonthly(input.loans);

  // --- Situación de caja en la apertura -------------------------------------------------------
  const desembolsoInversion = input.inversion.reduce((acc, p) => acc + desembolsoPartida(p) + ivaPartida(p), 0);
  const ivaInversion = input.inversion.reduce((acc, p) => acc + ivaPartida(p), 0);
  let cuotasPreApertura = 0;
  for (const [m, v] of loanByMonth) if (m < aperturaMonth) cuotasPreApertura += v.cuota;
  const fuentesIniciales =
    input.socios.reduce((a, x) => a + (x.aportacionDinero || 0), 0) +
    input.loans.reduce((a, l) => a + l.neto, 0) +
    input.otrasFuentes.filter(fuenteCuenta).reduce((a, f) => a + (f.importe || 0), 0);
  const desembolsoInicial = desembolsoInversion + input.imprevistos + cuotasPreApertura;
  const cajaInicial = fuentesIniciales - desembolsoInicial;

  // --- Datos fijos por mes ----------------------------------------------------------------------
  const fijosMes = input.gastosFijos.reduce((a, g) => a + (g.importeMensual || 0), 0);
  const ivaFijosMes = input.gastosFijos.reduce((a, g) => a + (g.importeMensual || 0) * ((g.ivaPct || 0) / 100), 0);
  const alquilerMes = input.gastosFijos.filter(isAlquiler).reduce((a, g) => a + (g.importeMensual || 0), 0);
  const leasingItems = input.inversion.filter((p) => p.modo === 'leasing' || p.modo === 'renting');
  const leasingMes = leasingItems.reduce((a, p) => a + (p.cuotaMensual || 0), 0);
  const ivaLeasingMes = leasingItems.reduce((a, p) => a + (p.cuotaMensual || 0) * ((p.ivaPct || 21) / 100), 0);
  const amortizables = input.inversion
    .filter((p) => p.modo === 'compra' && p.amortAnios > 0)
    .map((p) => ({ mensual: desembolsoPartida(p) / (p.amortAnios * 12), meses: p.amortAnios * 12 }));

  const empleados = input.costes.filter((c) => c.persona.tipo === 'empleado');
  const sociosPersonal = input.personal.filter((p) => p.tipo === 'socio');
  const participacionTotal = input.socios.reduce((a, x) => a + (x.participacionPct || 0), 0);
  const shareOf = (p: Persona): number => {
    const socio = input.socios.find((x) => x.id === p.socioId);
    if (socio && participacionTotal > 0) return (socio.participacionPct || 0) / participacionTotal;
    return sociosPersonal.length ? 1 / sociosPersonal.length : 0;
  };

  const months: MonthRow[] = [];
  let caja = cajaInicial;
  let ivaAcumulado = -ivaInversion; // saldo de IVA del trimestre (negativo = a compensar)
  let ivaTrimestre = 0;
  let resultadoYTD = 0;
  let pagos130YTD = 0;
  const resultadoPorAnioNatural = new Map<number, number>();
  const pagos130PorAnioNatural = new Map<number, number>();
  const historicoResultado: number[] = [];

  for (let idx = 1; idx <= n; idx++) {
    const month = addMonths(aperturaMonth, idx - 1);
    const mi = monthIndex(month);
    const year = Number(month.slice(0, 4));
    const ramp = (s.rampUp[idx - 1] ?? 100) / 100;
    const season = (s.estacionalidad[mi] ?? 100) / 100;
    const growth = Math.pow(1 + (s.crecimientoAnualPct || 0) / 100, Math.floor((idx - 1) / 12));

    let ventasBrutas = 0;
    let ventasNetas = 0;
    let tickets = 0;
    let materiaPrima = 0;
    let comisiones = 0;
    for (const f of input.franjas) {
      if (idx < Math.max(1, f.mesInicio || 1)) continue;
      const t = (f.ticketsDia || 0) * (f.diasMes || 0) * ramp * season * growth * factor;
      const bruto = t * (f.ticketMedio || 0);
      const neto = bruto / (1 + (f.ivaPct || 0) / 100);
      tickets += t;
      ventasBrutas += bruto;
      ventasNetas += neto;
      materiaPrima += neto * foodCost(f, input);
      comisiones += bruto * ((f.comisionPct || 0) / 100);
    }

    const personal = empleados
      .filter((c) => !c.persona.fechaAlta || monthKey(c.persona.fechaAlta) <= month)
      .reduce((a, c) => a + c.costeEmpresaMensual, 0);

    // Cuota de autónomos: tarifa plana y después por tramo según el rendimiento medio de los últimos 12 meses.
    const ultimos = historicoResultado.slice(-12);
    const rendimientoMedio = ultimos.length ? ultimos.reduce((a, b) => a + b, 0) / ultimos.length : 0;
    const autonomos = sociosPersonal.reduce((a, p) => {
      const alta = isISODate(p.fechaAlta) ? monthKey(p.fechaAlta) : aperturaMonth;
      if (alta > month) return a;
      const meses = monthsBetween(alta, month);
      return a + cuotaAutonomo(rendimientoMedio * shareOf(p), meses, s);
    }, 0);

    const amortizacion = amortizables.reduce((a, x) => a + (idx <= x.meses ? x.mensual : 0), 0);
    const loan = loanByMonth.get(month) ?? { cuota: 0, interes: 0, amortizacion: 0 };
    const ebitda = ventasNetas - materiaPrima - comisiones - personal - autonomos - fijosMes - leasingMes;
    const resultado = ebitda - amortizacion - loan.interes;
    historicoResultado.push(resultado);
    resultadoPorAnioNatural.set(year, (resultadoPorAnioNatural.get(year) ?? 0) + resultado);

    let ivaPagado = 0;
    let irpfPagado = 0;
    if (QUARTER_PAYMENT_MONTHS.has(mi) && idx > 1) {
      // Se liquida el trimestre natural anterior (IVA: modelo 303; IRPF: modelo 130).
      ivaAcumulado += ivaTrimestre;
      ivaTrimestre = 0;
      if (ivaAcumulado > 0) {
        ivaPagado = ivaAcumulado;
        ivaAcumulado = 0;
      }
      // Modelo 130: 20 % del rendimiento acumulado del año menos lo ya pagado.
      const anioLiquidado = mi === 0 ? year - 1 : year;
      if (mi === 0) {
        resultadoYTD = resultadoPorAnioNatural.get(anioLiquidado) ?? 0;
        pagos130YTD = pagos130PorAnioNatural.get(anioLiquidado) ?? 0;
      } else {
        resultadoYTD = (resultadoPorAnioNatural.get(year) ?? 0) - resultado; // hasta el mes anterior
        pagos130YTD = pagos130PorAnioNatural.get(year) ?? 0;
      }
      const pago = Math.max(0, resultadoYTD * 0.2 - pagos130YTD);
      pagos130PorAnioNatural.set(anioLiquidado, pagos130YTD + pago);
      irpfPagado += pago;
    }
    // Regularización en la declaración de la renta (junio del año siguiente).
    if (mi === 5 && resultadoPorAnioNatural.has(year - 1)) {
      const rend = resultadoPorAnioNatural.get(year - 1)!;
      const irpfReal = sociosPersonal.length
        ? sociosPersonal.reduce((a, p) => a + irpfAnual(rend * shareOf(p)).total, 0)
        : irpfAnual(rend).total;
      irpfPagado += irpfReal - (pagos130PorAnioNatural.get(year - 1) ?? 0);
    }

    // IVA del mes en curso: repercutido - soportado (se liquida al acabar el trimestre).
    const ivaRepercutido = ventasBrutas - ventasNetas;
    const ivaSoportado = materiaPrima * (s.ivaComprasPct / 100) + ivaFijosMes + ivaLeasingMes;
    ivaTrimestre += ivaRepercutido - ivaSoportado;

    const retiradas = sociosPersonal
      .filter((p) => !p.fechaAlta || monthKey(p.fechaAlta) <= month)
      .reduce((a, p) => a + (p.retiradaMensual || 0), 0);

    const flujo =
      ventasBrutas -
      materiaPrima * (1 + s.ivaComprasPct / 100) -
      comisiones -
      personal -
      autonomos -
      (fijosMes + ivaFijosMes) -
      (leasingMes + ivaLeasingMes) -
      loan.cuota -
      ivaPagado -
      irpfPagado -
      retiradas;
    caja += flujo;

    months.push({
      idx,
      month,
      ventasBrutas,
      ventasNetas,
      tickets,
      materiaPrima,
      comisiones,
      personal,
      autonomos,
      fijos: fijosMes,
      leasing: leasingMes,
      ebitda,
      amortizacion,
      intereses: loan.interes,
      resultado,
      capitalPrestamos: loan.amortizacion,
      ivaPagado,
      irpfPagado,
      retiradas,
      flujo,
      caja,
    });
  }

  // --- Resúmenes anuales (años desde la apertura) -------------------------------------------
  const years: YearSummary[] = [];
  for (let y = 0; y * 12 < months.length; y++) {
    const slice = months.slice(y * 12, y * 12 + 12);
    const tot = (k: keyof MonthRow) => slice.reduce((a, m) => a + (m[k] as number), 0);
    const resultado = tot('resultado');
    const irpf = sociosPersonal.length
      ? sociosPersonal.reduce((a, p) => a + irpfAnual(resultado * shareOf(p)).total, 0)
      : irpfAnual(resultado).total;
    years.push({
      year: y + 1,
      label: `Año ${y + 1}`,
      ventasNetas: tot('ventasNetas'),
      materiaPrima: tot('materiaPrima'),
      comisiones: tot('comisiones'),
      personal: tot('personal'),
      autonomos: tot('autonomos'),
      fijos: tot('fijos'),
      leasing: tot('leasing'),
      ebitda: tot('ebitda'),
      amortizacion: tot('amortizacion'),
      intereses: tot('intereses'),
      resultado,
      irpf,
      beneficioNeto: resultado - irpf,
      flujo: tot('flujo'),
      cajaFinal: slice[slice.length - 1].caja,
    });
  }

  // --- Caja mínima ------------------------------------------------------------------------------
  let cajaMinima = { valor: cajaInicial, month: addMonths(aperturaMonth, -1), idx: 0 };
  for (const m of months) if (m.caja < cajaMinima.valor) cajaMinima = { valor: m.caja, month: m.month, idx: m.idx };
  const primerMesCajaNegativa = cajaInicial < 0 ? null : months.find((m) => m.caja < 0) ?? null;

  // --- Punto de equilibrio en un mes "tipo" (100 % ramp-up y estacionalidad) ------------------
  let contribucion = 0;
  let ventasTipo = 0;
  let ticketsDiaPrevistos = 0;
  for (const f of input.franjas) {
    const t = (f.ticketsDia || 0) * (f.diasMes || 0) * factor;
    const bruto = t * (f.ticketMedio || 0);
    const neto = bruto / (1 + (f.ivaPct || 0) / 100);
    contribucion += neto * (1 - foodCost(f, input)) - bruto * ((f.comisionPct || 0) / 100);
    ventasTipo += neto;
    ticketsDiaPrevistos += (f.ticketsDia || 0) * factor * ((f.diasMes || 0) / 30);
  }
  const anio2 = months.slice(12, 24).length ? months.slice(12, 24) : months.slice(0, 12);
  const fijosTipo =
    anio2.reduce((a, m) => a + m.personal + m.autonomos + m.fijos + m.leasing + m.amortizacion + m.intereses, 0) /
    anio2.length;
  const k = contribucion > 0 ? fijosTipo / contribucion : Infinity;
  const breakEven = {
    ventasMes: ventasTipo * k,
    ticketsDia: ticketsDiaPrevistos * k,
    ticketsDiaPrevistos,
    pctVentasPrevistas: k * 100,
  };

  // --- Recuperación de la inversión ----------------------------------------------------------
  const inversionTotal = input.inversion.reduce((a, p) => a + desembolsoPartida(p), 0) + input.imprevistos;
  let acumulado = 0;
  let paybackMeses: number | null = null;
  for (const m of months) {
    acumulado += m.ebitda - m.irpfPagado;
    if (acumulado >= inversionTotal && inversionTotal > 0) {
      paybackMeses = m.idx;
      break;
    }
  }

  const y1 = years[0];
  const ratio = (x: number) => (y1 && y1.ventasNetas > 0 ? (x / y1.ventasNetas) * 100 : 0);
  const ratiosAnio1 = {
    foodCostPct: ratio(y1?.materiaPrima ?? 0),
    personalPct: ratio((y1?.personal ?? 0) + (y1?.autonomos ?? 0)),
    alquilerPct: ratio(alquilerMes * 12),
    primeCostPct: ratio((y1?.materiaPrima ?? 0) + (y1?.personal ?? 0) + (y1?.autonomos ?? 0)),
    ebitdaPct: ratio(y1?.ebitda ?? 0),
  };

  // --- Neto por socio ----------------------------------------------------------------------------
  const sociosOut: SocioYear[] = input.socios.map((socio) => {
    const share = participacionTotal > 0 ? (socio.participacionPct || 0) / participacionTotal : 1 / (input.socios.length || 1);
    const persona = sociosPersonal.find((p) => p.socioId === socio.id);
    return {
      socioId: socio.id,
      nombre: socio.nombre,
      participacionPct: share * 100,
      porAnio: years.map((y) => {
        const rendimiento = y.resultado * share;
        const irpf = irpfAnual(rendimiento).total;
        const neto = rendimiento - irpf;
        return { year: y.year, rendimiento, irpf, neto, netoMensual: neto / 12, retiradas: (persona?.retiradaMensual ?? 0) * 12 };
      }),
    };
  });

  return {
    aperturaMonth,
    escenarioPct: factor * 100,
    cajaInicial,
    desembolsoInicial,
    fuentesIniciales,
    months,
    years,
    cajaMinima,
    primerMesCajaNegativa,
    breakEven,
    paybackMeses,
    ratiosAnio1,
    socios: sociosOut,
  };
}
