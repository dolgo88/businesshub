import type { Derived } from './state/derived';
import type { Database } from './data/types';
import { eurShort, num, pct } from './lib/format';

export interface ModuleDef {
  id: string;
  path: string;
  title: string;
  description: string;
  color: string;
  badge: (d: Derived, db: Database) => string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'cronograma', path: '/cronograma', title: 'Cronograma', color: '#b0612a',
    description: 'Todos los pasos hasta el kick-off, con dependencias, fechas límite y aviso si el plan no llega.',
    badge: (d) => `${d.schedule.done}/${d.schedule.total} hechas`,
  },
  {
    id: 'presupuesto', path: '/presupuesto', title: 'Presupuesto', color: '#8a5a3b',
    description: 'Inversión inicial por categorías y gastos fijos mensuales.',
    badge: (d) => eurShort(d.budget.totalNecesidades),
  },
  {
    id: 'financiacion', path: '/financiacion', title: 'Financiación', color: '#3d6a8a',
    description: 'De dónde sale el dinero: socios, préstamos (cuota, intereses, TAE) y otras ayudas.',
    badge: (d) => `${pct(d.financing.coberturaPct, 0)} cubierto`,
  },
  {
    id: 'rrhh', path: '/rrhh', title: 'Equipo', color: '#5d7d58',
    description: 'Personas, salarios según convenio, coste de empresa y cobertura de horarios.',
    badge: (_d, db) => `${db.Personal.length} personas`,
  },
  {
    id: 'menu', path: '/menu', title: 'Menú', color: '#a8452f',
    description: 'Ingredientes, escandallos, food cost, precio sugerido y alérgenos.',
    badge: (d) => `${d.menu.platos.length} platos`,
  },
  {
    id: 'proyecciones', path: '/proyecciones', title: 'Proyecciones', color: '#6b4f8a',
    description: 'Tickets, ventas, resultados, impuestos, tesorería y punto de equilibrio a 3 años.',
    badge: (d) => `Equilibrio ${num(d.projection.breakEven.ticketsDia)} t/día`,
  },
  {
    id: 'locales', path: '/locales', title: 'Locales', color: '#2f7c7a',
    description: 'Comparador de locales candidatos con puntuación ponderada.',
    badge: (_d, db) => `${db.Locales.filter((l) => l.estado !== 'descartado').length} candidatos`,
  },
  {
    id: 'tramites', path: '/tramites', title: 'Trámites', color: '#9a7b1f',
    description: 'Licencias y obligaciones legales en Barcelona, con estado y fechas.',
    badge: (_d, db) => `${db.Tramites.filter((t) => t.estado === 'hecho' || t.estado === 'no aplica').length}/${db.Tramites.length}`,
  },
  {
    id: 'documentos', path: '/documentos', title: 'Documentos', color: '#56606e',
    description: 'Enlaces organizados a contratos, planos, presupuestos y facturas en Drive.',
    badge: (_d, db) => `${db.Documentos.length} enlaces`,
  },
  {
    id: 'plan', path: '/plan', title: 'Plan de negocio', color: '#2b1e15',
    description: 'Documento para el banco, listo para imprimir o guardar en PDF.',
    badge: () => 'PDF',
  },
];

export const SETTINGS_MODULE = { id: 'ajustes', path: '/ajustes', title: 'Ajustes', color: '#7b6a5b', description: 'Parámetros generales del proyecto y conexión con Google Sheets.' };

export function moduleById(id: string) {
  return MODULES.find((m) => m.id === id) ?? SETTINGS_MODULE;
}
