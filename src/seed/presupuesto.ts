import type { GastoFijo, PartidaInversion } from '../data/types';

type P = [
  id: string,
  categoria: string,
  concepto: string,
  cantidad: number,
  precioUnit: number,
  ivaPct: number,
  tareaId: string,
  amortAnios?: number,
  modo?: PartidaInversion['modo'],
  notas?: string,
];

// Estimaciones orientativas para un local de ~120 m² y ~40 plazas en Barcelona (precios sin IVA).
const RAW: P[] = [
  ['inv-fianza', 'Local', 'Fianza legal (2 mensualidades)', 2, 3500, 0, 'firma-local', 0, 'compra', 'Se recupera al dejar el local.'],
  ['inv-garantia', 'Local', 'Garantía adicional / aval (2 mensualidades)', 2, 3500, 0, 'firma-local', 0, 'compra', 'Muchos propietarios piden aval bancario.'],
  ['inv-traspaso', 'Local', 'Traspaso (si el local viene con licencia)', 1, 0, 21, 'firma-local', 10, 'compra', 'Un traspaso con licencia de restaurante puede costar 20.000–80.000 €, pero ahorra meses.'],
  ['inv-agencia', 'Local', 'Honorarios de agencia (1 mensualidad)', 1, 3500, 21, 'firma-local'],
  ['inv-renta-obras', 'Local', 'Renta durante obras (si no hay carencia)', 2, 3500, 21, 'obras', 0, 'compra', 'Negociar 2–4 meses de carencia.'],

  ['inv-proyecto', 'Legal y licencias', 'Proyecto técnico y dirección de obra', 1, 6000, 21, 'proyecto-tecnico', 10],
  ['inv-tasas', 'Legal y licencias', 'Tasas de licencia de actividad e ICIO', 1, 3500, 0, 'solicitud-licencia', 10],
  ['inv-gestoria', 'Legal y licencias', 'Gestoría/abogado: CB y pacto de socios', 1, 1200, 21, 'pacto'],
  ['inv-marca', 'Legal y licencias', 'Registro de marca (OEPM)', 1, 150, 0, 'marca'],
  ['inv-appcc', 'Legal y licencias', 'Plan APPCC y formación de manipuladores', 1, 600, 21, 'appcc'],

  ['inv-albanileria', 'Obras e instalaciones', 'Albañilería, pavimentos y acabados', 1, 25000, 21, 'obras', 10],
  ['inv-electricidad', 'Obras e instalaciones', 'Electricidad y aumento de potencia', 1, 9000, 21, 'obras', 10],
  ['inv-fontaneria', 'Obras e instalaciones', 'Fontanería y baños accesibles', 1, 7000, 21, 'obras', 10],
  ['inv-clima', 'Obras e instalaciones', 'Climatización', 1, 8000, 21, 'obras', 10],
  ['inv-humos', 'Obras e instalaciones', 'Salida de humos a cubierta y campana', 1, 15000, 21, 'salida-humos', 10],
  ['inv-pci', 'Obras e instalaciones', 'Protección contra incendios', 1, 2000, 21, 'obras', 10],
  ['inv-acustica', 'Obras e instalaciones', 'Aislamiento acústico (cenas)', 1, 4000, 21, 'obras', 10],

  ['inv-fogones', 'Maquinaria cocina', 'Cocina, fogones y plancha', 1, 4500, 21, 'pedido-maquinaria', 8],
  ['inv-horno-mixto', 'Maquinaria cocina', 'Horno mixto (convección-vapor)', 1, 7000, 21, 'pedido-maquinaria', 8],
  ['inv-frio', 'Maquinaria cocina', 'Cámaras y armarios refrigerados', 1, 6000, 21, 'pedido-maquinaria', 8],
  ['inv-mesas-frias', 'Maquinaria cocina', 'Mesas frías y bajomostrador', 1, 3500, 21, 'pedido-maquinaria', 8],
  ['inv-lavavajillas', 'Maquinaria cocina', 'Lavavajillas industrial', 1, 3000, 21, 'pedido-maquinaria', 8],
  ['inv-inox', 'Maquinaria cocina', 'Mesas inox, estanterías y pequeño equipo', 1, 4500, 21, 'pedido-maquinaria', 8],

  ['inv-cafetera', 'Café y barra', 'Cafetera profesional 2 grupos', 1, 9000, 21, 'acuerdo-cafe', 8, 'comodato', 'Muchos tostadores la ceden a cambio de exclusividad de café.'],
  ['inv-molinos', 'Café y barra', 'Molinos de café (2)', 2, 1200, 21, 'pedido-maquinaria', 8],
  ['inv-vitrina', 'Café y barra', 'Vitrina refrigerada (bocatas, pan, dulces)', 1, 4000, 21, 'pedido-maquinaria', 8],
  ['inv-botellero', 'Café y barra', 'Botellero y cámara de barra', 1, 1800, 21, 'pedido-maquinaria', 8],
  ['inv-hielo', 'Café y barra', 'Máquina de hielo y lavavasos', 1, 3000, 21, 'pedido-maquinaria', 8],

  ['inv-horno-pan', 'Obrador panadería', 'Horno de pisos para pan', 1, 18000, 21, 'pedido-maquinaria', 10, 'compra', 'Alternativa: leasing (~350 €/mes).'],
  ['inv-amasadora', 'Obrador panadería', 'Amasadora espiral', 1, 3500, 21, 'pedido-maquinaria', 8],
  ['inv-fermentadora', 'Obrador panadería', 'Cámara de fermentación controlada', 1, 6000, 21, 'pedido-maquinaria', 8],
  ['inv-utensilios-pan', 'Obrador panadería', 'Bannetons, latas, carros y utensilios', 1, 1200, 21, 'pedido-maquinaria', 5],

  ['inv-mesas', 'Mobiliario y menaje', 'Mesas y sillas (40 plazas)', 1, 8000, 21, 'mobiliario', 8],
  ['inv-barra', 'Mobiliario y menaje', 'Barra y mostrador', 1, 6000, 21, 'mobiliario', 10],
  ['inv-deco', 'Mobiliario y menaje', 'Iluminación y decoración', 1, 5000, 21, 'mobiliario', 8],
  ['inv-menaje', 'Mobiliario y menaje', 'Vajilla, cristalería, cubertería y menaje', 1, 3500, 21, 'mobiliario', 5],
  ['inv-packaging', 'Mobiliario y menaje', 'Envases take-away iniciales (reutilizables/compostables)', 1, 1000, 21, 'stock'],

  ['inv-tpv', 'Tecnología', 'TPV, impresora, cajón y software', 1, 1800, 21, 'tpv', 4],
  ['inv-wifi', 'Tecnología', 'Datáfonos, wifi, cámaras y música', 1, 1500, 21, 'tpv', 4],

  ['inv-diseno', 'Marca y marketing', 'Diseño de marca y carta', 1, 2500, 21, 'marca'],
  ['inv-rotulo', 'Marca y marketing', 'Rótulo exterior (en catalán)', 1, 2500, 21, 'rotulo', 8],
  ['inv-web', 'Marca y marketing', 'Web, fotos y redes', 1, 1500, 21, 'digital'],
  ['inv-inauguracion', 'Marca y marketing', 'Inauguración y promoción', 1, 1500, 21, 'soft-opening'],

  ['inv-stock', 'Stock y pre-apertura', 'Stock inicial (materia prima y bebidas)', 1, 5000, 10, 'stock'],
  ['inv-uniformes', 'Stock y pre-apertura', 'Uniformes y EPIs', 1, 600, 21, 'formacion'],
  ['inv-salarios-pre', 'Stock y pre-apertura', 'Salarios de formación antes de abrir', 1, 3000, 0, 'formacion'],
  ['inv-limpieza', 'Stock y pre-apertura', 'Limpieza final de obra', 1, 500, 21, 'limpieza'],
];

export const SEED_INVERSION: PartidaInversion[] = RAW.map(
  ([id, categoria, concepto, cantidad, precioUnit, ivaPct, tareaId, amortAnios = 0, modo = 'compra', notas = '']) => ({
    id,
    categoria,
    concepto,
    cantidad,
    precioUnit,
    ivaPct,
    modo,
    cuotaMensual: 0,
    amortAnios,
    estado: 'estimado',
    tareaId,
    proveedor: '',
    notas,
  }),
);

type G = [id: string, categoria: string, concepto: string, importe: number, ivaPct: number, notas?: string];

const RAW_GASTOS: G[] = [
  ['gf-alquiler', 'Local', 'Alquiler', 3500, 21],
  ['gf-ibi', 'Local', 'IBI y comunidad repercutidos', 250, 21],
  ['gf-luz', 'Suministros', 'Electricidad (horno, cocina, frío)', 900, 21],
  ['gf-gas', 'Suministros', 'Gas', 300, 21],
  ['gf-agua', 'Suministros', 'Agua', 120, 10],
  ['gf-internet', 'Suministros', 'Internet y teléfono', 60, 21],
  ['gf-seguros', 'Servicios', 'Seguros (RC y multirriesgo)', 125, 0],
  ['gf-gestoria', 'Servicios', 'Gestoría (contabilidad, nóminas, impuestos)', 250, 21],
  ['gf-software', 'Servicios', 'Software TPV, reservas y apps', 80, 21],
  ['gf-mantenimiento', 'Servicios', 'Mantenimiento y reparaciones', 200, 21],
  ['gf-limpieza', 'Servicios', 'Plagas, limpieza de campana y aceite usado', 150, 21],
  ['gf-lavanderia', 'Servicios', 'Lavandería (trapos, uniformes)', 100, 21],
  ['gf-residuos', 'Tasas', 'Tasa de residuos comerciales (Ajuntament)', 80, 0],
  ['gf-sgae', 'Tasas', 'SGAE / música ambiental', 40, 21],
  ['gf-marketing', 'Marketing', 'Redes sociales y promoción', 200, 21],
  ['gf-banco', 'Financieros', 'Comisiones bancarias', 30, 0, 'Las comisiones del TPV se calculan en Proyecciones.'],
];

export const SEED_GASTOS: GastoFijo[] = RAW_GASTOS.map(([id, categoria, concepto, importeMensual, ivaPct, notas = '']) => ({
  id,
  categoria,
  concepto,
  importeMensual,
  ivaPct,
  notas,
}));
