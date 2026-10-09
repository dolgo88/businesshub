// Tipos de cada tabla. Cada tabla se guarda como una pestaña del Google Sheet
// (una fila por registro, una columna por campo).

export interface Tarea {
  id: string;
  fase: string;
  nombre: string;
  responsable: string;
  duracion: number; // días naturales
  dependencias: string[]; // ids de tareas que deben terminar antes
  inicioFijo: string; // YYYY-MM-DD o '' (si se fija, la tarea empieza ese día)
  hecho: boolean;
  fechaHecho: string; // YYYY-MM-DD o ''
  notas: string;
}

export type EstadoPartida = 'estimado' | 'presupuestado' | 'pagado';
export type ModoPago = 'compra' | 'leasing' | 'renting' | 'comodato';

export interface PartidaInversion {
  id: string;
  categoria: string;
  concepto: string;
  cantidad: number;
  precioUnit: number; // sin IVA
  ivaPct: number;
  modo: ModoPago;
  cuotaMensual: number; // si leasing/renting (sin IVA)
  amortAnios: number; // años de amortización contable (0 = no se amortiza)
  estado: EstadoPartida;
  tareaId: string;
  proveedor: string;
  notas: string;
}

export interface GastoFijo {
  id: string;
  categoria: string;
  concepto: string;
  importeMensual: number; // sin IVA
  ivaPct: number;
  notas: string;
}

export interface Socio {
  id: string;
  nombre: string;
  aportacionDinero: number;
  aportacionEspecie: number;
  participacionPct: number;
  trabaja: boolean;
  notas: string;
}

export interface Prestamo {
  id: string;
  entidad: string;
  importe: number;
  tinPct: number;
  plazoMeses: number;
  carenciaMeses: number;
  comisionAperturaPct: number;
  fechaInicio: string; // YYYY-MM-DD (fecha de la firma; primera cuota al mes siguiente)
  notas: string;
}

export type EstadoFuente = 'idea' | 'solicitado' | 'concedido' | 'descartado';

export interface OtraFuente {
  id: string;
  tipo: string;
  concepto: string;
  importe: number;
  estado: EstadoFuente;
  notas: string;
}

export type TipoPersona = 'socio' | 'empleado';

export interface Persona {
  id: string;
  nombre: string;
  tipo: TipoPersona;
  puestoId: string;
  horasSemana: number;
  salarioBrutoAnual: number; // empleados
  pagas: number;
  fechaAlta: string; // YYYY-MM-DD
  retiradaMensual: number; // socios: dinero que prevé sacar cada mes
  socioId: string; // socios: vínculo con la tabla Socios
  notas: string;
}

export interface PuestoConvenio {
  id: string;
  puesto: string;
  nivel: string;
  salarioMensual: number; // por paga
  pagas: number;
  fuente: string;
}

export interface Turno {
  id: string;
  nombre: string;
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM (puede ser 24:00)
  diasSemana: number;
  personas: number;
}

export type Unidad = 'kg' | 'l' | 'ud';

export interface Ingrediente {
  id: string;
  nombre: string;
  categoria: string;
  proveedor: string;
  formato: string; // descripción del formato de compra
  precioFormato: number; // € sin IVA del formato
  cantidadFormato: number; // cuántas unidades (kg/l/ud) trae el formato
  unidad: Unidad;
  mermaPct: number;
  alergenos: string[];
  ivaPct: number;
  notas: string;
}

export type TipoPlato = 'plato' | 'subreceta';

export interface Plato {
  id: string;
  nombre: string;
  tipo: TipoPlato;
  categoria: string;
  linea: string; // línea de negocio (enlaza con las franjas de Proyecciones)
  ivaPct: number;
  foodCostObjetivoPct: number;
  pvp: number; // precio de venta con IVA (0 = usar el sugerido)
  rendimiento: number; // subrecetas: cuántas unidades salen
  unidadRendimiento: Unidad;
  peso: number; // peso en el mix de ventas de su línea
  activo: boolean;
  notas: string;
}

export interface Componente {
  id: string;
  platoId: string;
  componenteId: string; // id de ingrediente o de subreceta
  cantidad: number; // en la unidad del componente
}

export interface Franja {
  id: string;
  nombre: string;
  linea: string;
  ticketsDia: number;
  ticketMedio: number; // con IVA
  ivaPct: number;
  diasMes: number;
  mesInicio: number; // 1 = mes de apertura
  comisionPct: number; // TPV, delivery...
  notas: string;
}

export type EstadoLocal = 'pendiente' | 'visitado' | 'negociando' | 'descartado' | 'elegido';

export interface Local {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string;
  m2: number;
  renta: number; // mensual sin IVA
  traspaso: number;
  fianzaMeses: number;
  garantiaMeses: number;
  obrasEstimadas: number;
  licencia: string; // ninguna | bar | restaurante | restaurante con cocina | obrador
  salidaHumos: boolean;
  plaUsos: string; // si | no | pendiente
  notaOficinas: number; // 1-5
  notaAfluencia: number; // 1-5
  notaVisibilidad: number; // 1-5
  notaEstado: number; // 1-5 (estado del local / instalaciones)
  estado: EstadoLocal;
  enlace: string;
  notas: string;
}

export type EstadoTramite = 'pendiente' | 'en curso' | 'hecho' | 'no aplica';

export interface Tramite {
  id: string;
  categoria: string;
  nombre: string;
  organismo: string;
  estado: EstadoTramite;
  responsable: string;
  fechaLimite: string;
  coste: number;
  tareaId: string;
  enlace: string;
  notas: string;
}

export interface Documento {
  id: string;
  titulo: string;
  categoria: string;
  url: string;
  vinculo: string;
  fecha: string;
  notas: string;
}

export interface ConfigRow {
  clave: string;
  valor: string;
}

export interface Database {
  Config: ConfigRow[];
  Tareas: Tarea[];
  Inversion: PartidaInversion[];
  GastosFijos: GastoFijo[];
  Socios: Socio[];
  Prestamos: Prestamo[];
  OtrasFuentes: OtraFuente[];
  Personal: Persona[];
  Convenio: PuestoConvenio[];
  Turnos: Turno[];
  Ingredientes: Ingrediente[];
  Platos: Plato[];
  Componentes: Componente[];
  Franjas: Franja[];
  Locales: Local[];
  Tramites: Tramite[];
  Documentos: Documento[];
}

export type TableName = keyof Database;
