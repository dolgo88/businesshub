import type { Database } from '../data/types';
import { DEFAULT_SETTINGS, settingsToRows } from '../data/settings';
import { SEED_TAREAS } from './tareas';
import { SEED_GASTOS, SEED_INVERSION } from './presupuesto';
import { SEED_CONVENIO, SEED_OTRAS_FUENTES, SEED_PERSONAL, SEED_PRESTAMOS, SEED_SOCIOS, SEED_TURNOS } from './equipo';
import { SEED_COMPONENTES, SEED_FRANJAS, SEED_INGREDIENTES, SEED_PLATOS } from './menu';
import { SEED_DOCUMENTOS, SEED_LOCALES, SEED_TRAMITES } from './extras';

/** Datos de ejemplo para un café-panadería-restaurante en Barcelona. */
export function seedDatabase(): Database {
  return structuredClone({
    Config: settingsToRows(DEFAULT_SETTINGS),
    Tareas: SEED_TAREAS,
    Inversion: SEED_INVERSION,
    GastosFijos: SEED_GASTOS,
    Socios: SEED_SOCIOS,
    Prestamos: SEED_PRESTAMOS,
    OtrasFuentes: SEED_OTRAS_FUENTES,
    Personal: SEED_PERSONAL,
    Convenio: SEED_CONVENIO,
    Turnos: SEED_TURNOS,
    Ingredientes: SEED_INGREDIENTES,
    Platos: SEED_PLATOS,
    Componentes: SEED_COMPONENTES,
    Franjas: SEED_FRANJAS,
    Locales: SEED_LOCALES,
    Tramites: SEED_TRAMITES,
    Documentos: SEED_DOCUMENTOS,
  });
}
