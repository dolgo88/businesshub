import type { Database, TableName } from './types';

/** Tipo de cada columna: decide cómo se guarda en el Sheet y cómo se lee de vuelta. */
export type ColType = 'string' | 'number' | 'boolean' | 'list' | 'date';

type Columns<T> = { [K in keyof T]-?: ColType };
type Schema = { [K in TableName]: Columns<Database[K][number]> };

export const SCHEMA: Schema = {
  Config: { clave: 'string', valor: 'string' },
  Tareas: {
    id: 'string', fase: 'string', nombre: 'string', responsable: 'string', duracion: 'number',
    dependencias: 'list', inicioFijo: 'date', hecho: 'boolean', fechaHecho: 'date', notas: 'string',
  },
  Inversion: {
    id: 'string', categoria: 'string', concepto: 'string', cantidad: 'number', precioUnit: 'number',
    ivaPct: 'number', modo: 'string', cuotaMensual: 'number', amortAnios: 'number', estado: 'string',
    tareaId: 'string', proveedor: 'string', notas: 'string',
  },
  GastosFijos: {
    id: 'string', categoria: 'string', concepto: 'string', importeMensual: 'number', ivaPct: 'number', notas: 'string',
  },
  Socios: {
    id: 'string', nombre: 'string', aportacionDinero: 'number', aportacionEspecie: 'number',
    participacionPct: 'number', trabaja: 'boolean', notas: 'string',
  },
  Prestamos: {
    id: 'string', entidad: 'string', importe: 'number', tinPct: 'number', plazoMeses: 'number',
    carenciaMeses: 'number', comisionAperturaPct: 'number', fechaInicio: 'date', notas: 'string',
  },
  OtrasFuentes: { id: 'string', tipo: 'string', concepto: 'string', importe: 'number', estado: 'string', notas: 'string' },
  Personal: {
    id: 'string', nombre: 'string', tipo: 'string', puestoId: 'string', horasSemana: 'number',
    salarioBrutoAnual: 'number', pagas: 'number', fechaAlta: 'date', retiradaMensual: 'number',
    socioId: 'string', notas: 'string',
  },
  Convenio: { id: 'string', puesto: 'string', nivel: 'string', salarioMensual: 'number', pagas: 'number', fuente: 'string' },
  Turnos: { id: 'string', nombre: 'string', horaInicio: 'string', horaFin: 'string', diasSemana: 'number', personas: 'number' },
  Ingredientes: {
    id: 'string', nombre: 'string', categoria: 'string', proveedor: 'string', formato: 'string',
    precioFormato: 'number', cantidadFormato: 'number', unidad: 'string', mermaPct: 'number',
    alergenos: 'list', ivaPct: 'number', notas: 'string',
  },
  Platos: {
    id: 'string', nombre: 'string', tipo: 'string', categoria: 'string', linea: 'string', ivaPct: 'number',
    foodCostObjetivoPct: 'number', pvp: 'number', rendimiento: 'number', unidadRendimiento: 'string',
    peso: 'number', activo: 'boolean', notas: 'string',
  },
  Componentes: { id: 'string', platoId: 'string', componenteId: 'string', cantidad: 'number' },
  Franjas: {
    id: 'string', nombre: 'string', linea: 'string', ticketsDia: 'number', ticketMedio: 'number', ivaPct: 'number',
    diasMes: 'number', mesInicio: 'number', comisionPct: 'number', notas: 'string',
  },
  Locales: {
    id: 'string', nombre: 'string', direccion: 'string', distrito: 'string', m2: 'number', renta: 'number',
    traspaso: 'number', fianzaMeses: 'number', garantiaMeses: 'number', obrasEstimadas: 'number',
    licencia: 'string', salidaHumos: 'boolean', plaUsos: 'string', notaOficinas: 'number',
    notaAfluencia: 'number', notaVisibilidad: 'number', notaEstado: 'number', estado: 'string',
    enlace: 'string', notas: 'string',
  },
  Tramites: {
    id: 'string', categoria: 'string', nombre: 'string', organismo: 'string', estado: 'string',
    responsable: 'string', fechaLimite: 'date', coste: 'number', tareaId: 'string', enlace: 'string', notas: 'string',
  },
  Documentos: { id: 'string', titulo: 'string', categoria: 'string', url: 'string', vinculo: 'string', fecha: 'date', notas: 'string' },
};

export const TABLE_NAMES = Object.keys(SCHEMA) as TableName[];

export interface ColumnSpec {
  name: string;
  type: ColType;
}

export function columnsOf(table: TableName): ColumnSpec[] {
  return Object.entries(SCHEMA[table]).map(([name, type]) => ({ name, type: type as ColType }));
}

type RawRow = Record<string, unknown>;

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return 0;
    // admite "1.234,5" (formato español) y "1234.5"
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return 0;
}

function toBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['true', 'verdadero', 'si', 'sí', '1', 'x'].includes(v.trim().toLowerCase());
  return false;
}

function toDate(v: unknown): string {
  if (!v) return '';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const es = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (es) return `${es[3]}-${es[2].padStart(2, '0')}-${es[1].padStart(2, '0')}`;
  return '';
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (v === null || v === undefined) return [];
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Convierte una fila tal y como llega del Sheet al tipo de la tabla. */
export function parseRow<T extends TableName>(table: T, raw: RawRow): Database[T][number] {
  const out: RawRow = {};
  for (const [name, type] of Object.entries(SCHEMA[table]) as [string, ColType][]) {
    const v = raw[name];
    switch (type) {
      case 'number':
        out[name] = toNumber(v);
        break;
      case 'boolean':
        out[name] = toBoolean(v);
        break;
      case 'date':
        out[name] = toDate(v);
        break;
      case 'list':
        out[name] = toList(v);
        break;
      default:
        out[name] = v === null || v === undefined ? '' : String(v);
    }
  }
  return out as unknown as Database[T][number];
}

/** Convierte una fila tipada a valores planos para guardar en el Sheet. */
export function serializeRow<T extends TableName>(table: T, row: Database[T][number]): RawRow {
  const out: RawRow = {};
  const r = row as unknown as RawRow;
  for (const [name, type] of Object.entries(SCHEMA[table]) as [string, ColType][]) {
    const v = r[name];
    if (type === 'list') out[name] = Array.isArray(v) ? v.join(',') : String(v ?? '');
    else if (type === 'number') out[name] = toNumber(v);
    else if (type === 'boolean') out[name] = Boolean(v);
    else out[name] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

export function emptyDatabase(): Database {
  const db = {} as Record<TableName, unknown[]>;
  for (const t of TABLE_NAMES) db[t] = [];
  return db as unknown as Database;
}
