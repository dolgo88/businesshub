import type { OtraFuente, Persona, Prestamo, PuestoConvenio, Socio, Turno } from '../data/types';

export const SEED_SOCIOS: Socio[] = [
  { id: 'socio-1', nombre: 'Socio 1', aportacionDinero: 45000, aportacionEspecie: 0, participacionPct: 50, trabaja: true, notas: '' },
  { id: 'socio-2', nombre: 'Socio 2', aportacionDinero: 45000, aportacionEspecie: 0, participacionPct: 50, trabaja: true, notas: '' },
];

export const SEED_PRESTAMOS: Prestamo[] = [
  {
    id: 'pr-banco',
    entidad: 'Préstamo bancario (ej. MicroBank / línea ICO)',
    importe: 200000,
    tinPct: 6.5,
    plazoMeses: 84,
    carenciaMeses: 6,
    comisionAperturaPct: 0.5,
    fechaInicio: '2027-01-15',
    notas: 'Los bancos suelen pedir 20–30 % de fondos propios y un aval (Avalis puede avalar).',
  },
];

export const SEED_OTRAS_FUENTES: OtraFuente[] = [
  { id: 'of-paro', tipo: 'Capitalización', concepto: 'Pago único de la prestación por desempleo (si algún socio la cobra)', importe: 0, estado: 'idea', notas: 'Hay que pedirlo ANTES de darse de alta como autónomo.' },
  { id: 'of-enisa', tipo: 'Préstamo participativo', concepto: 'ENISA Jóvenes / Emprendedores', importe: 0, estado: 'idea', notas: 'Sin garantías personales; exige fondos propios equivalentes.' },
  { id: 'of-ayudas', tipo: 'Subvención', concepto: 'Ayudas a la creación de empresa (Barcelona Activa / Generalitat)', importe: 0, estado: 'idea', notas: 'Consultar convocatorias abiertas.' },
];

const FUENTE_CONVENIO = "Conveni d'hostaleria de Catalunya 2025-2028 (DOGC 9630, 23/03/2026) · grupo D · Barcelona · 2026. Verificar con la gestoría.";

export const SEED_CONVENIO: PuestoConvenio[] = [
  { id: 'conv-encargado', puesto: 'Encargado/a de establecimiento / jefe/a de sala', nivel: 'I', salarioMensual: 1735.87, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-jefe-cocina', puesto: 'Jefe/a de cocina', nivel: 'I', salarioMensual: 1735.87, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-jefe-partida', puesto: 'Jefe/a de partida / 2º encargado/a', nivel: 'II', salarioMensual: 1669.28, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-cocinero', puesto: 'Cocinero/a', nivel: 'III', salarioMensual: 1607.25, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-camarero', puesto: 'Camarero/a / barista', nivel: 'III', salarioMensual: 1607.25, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-panadero', puesto: 'Panadero/a - pastelero/a', nivel: 'III', salarioMensual: 1607.25, pagas: 14, fuente: FUENTE_CONVENIO + ' Equiparado a cocinero/a.' },
  { id: 'conv-ayudante-cocina', puesto: 'Ayudante de cocina', nivel: 'IV', salarioMensual: 1577.05, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-ayudante-sala', puesto: 'Ayudante de camarero/a', nivel: 'IV', salarioMensual: 1577.05, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-auxiliar', puesto: 'Auxiliar de cocina / office / limpieza', nivel: 'V', salarioMensual: 1541.14, pagas: 14, fuente: FUENTE_CONVENIO },
  { id: 'conv-auxiliar-nuevo', puesto: 'Auxiliar sin experiencia', nivel: 'V bis', salarioMensual: 1386.87, pagas: 14, fuente: FUENTE_CONVENIO },
];

export const SEED_PERSONAL: Persona[] = [
  { id: 'per-socio-1', nombre: 'Socio 1', tipo: 'socio', puestoId: 'conv-encargado', horasSemana: 50, salarioBrutoAnual: 0, pagas: 14, fechaAlta: '2027-03-01', retiradaMensual: 1500, socioId: 'socio-1', notas: 'Autónomo: cobra del beneficio, no de nómina.' },
  { id: 'per-socio-2', nombre: 'Socio 2', tipo: 'socio', puestoId: 'conv-cocinero', horasSemana: 50, salarioBrutoAnual: 0, pagas: 14, fechaAlta: '2027-03-01', retiradaMensual: 1500, socioId: 'socio-2', notas: 'Autónomo: cobra del beneficio, no de nómina.' },
  { id: 'per-panadero', nombre: 'Panadero/a', tipo: 'empleado', puestoId: 'conv-panadero', horasSemana: 40, salarioBrutoAnual: 22502, pagas: 14, fechaAlta: '2027-03-15', retiradaMensual: 0, socioId: '', notas: 'Turno de madrugada.' },
  { id: 'per-camarero-1', nombre: 'Camarero/a - barista', tipo: 'empleado', puestoId: 'conv-camarero', horasSemana: 40, salarioBrutoAnual: 22502, pagas: 14, fechaAlta: '2027-03-15', retiradaMensual: 0, socioId: '', notas: '' },
  { id: 'per-ayudante', nombre: 'Ayudante de cocina', tipo: 'empleado', puestoId: 'conv-ayudante-cocina', horasSemana: 30, salarioBrutoAnual: 16559, pagas: 14, fechaAlta: '2027-03-15', retiradaMensual: 0, socioId: '', notas: 'Media jornada ampliada.' },
  { id: 'per-camarero-2', nombre: 'Camarero/a tardes-noches', tipo: 'empleado', puestoId: 'conv-camarero', horasSemana: 30, salarioBrutoAnual: 16876, pagas: 14, fechaAlta: '2027-03-15', retiradaMensual: 0, socioId: '', notas: '' },
];

export const SEED_TURNOS: Turno[] = [
  { id: 'tu-obrador', nombre: 'Obrador (pan de madrugada)', horaInicio: '04:00', horaFin: '08:00', diasSemana: 6, personas: 1 },
  { id: 'tu-manana', nombre: 'Mañana: café, desayunos y take-away', horaInicio: '07:00', horaFin: '16:00', diasSemana: 6, personas: 3 },
  { id: 'tu-tarde', nombre: 'Tarde', horaInicio: '16:00', horaFin: '19:00', diasSemana: 6, personas: 1 },
  { id: 'tu-cenas', nombre: 'Cenas', horaInicio: '19:00', horaFin: '24:00', diasSemana: 5, personas: 3 },
];
