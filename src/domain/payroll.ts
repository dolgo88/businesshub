import type { Persona, PuestoConvenio, Turno } from '../data/types';

export const JORNADA_COMPLETA = 40;

export interface CostePersona {
  persona: Persona;
  puesto?: PuestoConvenio;
  brutoAnual: number;
  costeEmpresaAnual: number;
  costeEmpresaMensual: number;
  minimoConvenioAnual: number; // proporcional a la jornada
  bajoConvenio: boolean;
}

export function minimoConvenioAnual(puesto: PuestoConvenio | undefined, horasSemana: number): number {
  if (!puesto) return 0;
  return puesto.salarioMensual * (puesto.pagas || 14) * Math.min(1, Math.max(0, horasSemana) / JORNADA_COMPLETA);
}

export function costePersona(p: Persona, convenio: PuestoConvenio[], ssEmpresaPct: number): CostePersona {
  const puesto = convenio.find((c) => c.id === p.puestoId);
  const minimo = minimoConvenioAnual(puesto, p.horasSemana);
  if (p.tipo === 'socio') {
    return {
      persona: p,
      puesto,
      brutoAnual: 0,
      costeEmpresaAnual: 0,
      costeEmpresaMensual: 0,
      minimoConvenioAnual: minimo,
      bajoConvenio: false,
    };
  }
  const bruto = Math.max(0, p.salarioBrutoAnual || 0);
  const coste = bruto * (1 + ssEmpresaPct / 100);
  return {
    persona: p,
    puesto,
    brutoAnual: bruto,
    costeEmpresaAnual: coste,
    costeEmpresaMensual: coste / 12,
    minimoConvenioAnual: minimo,
    bajoConvenio: minimo > 0 && bruto + 0.5 < minimo,
  };
}

export function horasTurno(t: Turno): number {
  const parse = (s: string) => {
    const [h, m] = (s || '0:0').split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  };
  const ini = parse(t.horaInicio);
  let fin = parse(t.horaFin);
  if (fin <= ini) fin += 24;
  return fin - ini;
}

export interface Cobertura {
  horasNecesarias: number; // persona-horas por semana
  horasDisponibles: number;
  diferencia: number; // > 0 sobran, < 0 faltan
  personasJornadaCompletaFaltan: number;
  porTurno: { turno: Turno; horas: number; personaHoras: number }[];
}

export function cobertura(turnos: Turno[], personal: Persona[]): Cobertura {
  const porTurno = turnos.map((t) => {
    const horas = horasTurno(t);
    return { turno: t, horas, personaHoras: horas * (t.diasSemana || 0) * (t.personas || 0) };
  });
  const horasNecesarias = porTurno.reduce((s, x) => s + x.personaHoras, 0);
  const horasDisponibles = personal.reduce((s, p) => s + (p.horasSemana || 0), 0);
  const diferencia = horasDisponibles - horasNecesarias;
  return {
    horasNecesarias,
    horasDisponibles,
    diferencia,
    personasJornadaCompletaFaltan: diferencia < 0 ? -diferencia / JORNADA_COMPLETA : 0,
    porTurno,
  };
}
