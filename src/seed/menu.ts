import type { Componente, Franja, Ingrediente, Plato, Unidad } from '../data/types';

type I = [id: string, nombre: string, categoria: string, formato: string, precio: number, cantidad: number, unidad: Unidad, merma: number, alergenos: string[], iva: number];

// Precios orientativos de proveedor (sin IVA). Actualizadlos con vuestras tarifas reales.
const RAW_ING: I[] = [
  ['ing-harina-t80', 'Harina panificable T80', 'Harinas', 'Saco 25 kg', 22, 25, 'kg', 0, ['gluten'], 4],
  ['ing-harina-integral', 'Harina integral', 'Harinas', 'Saco 25 kg', 27, 25, 'kg', 0, ['gluten'], 4],
  ['ing-sal', 'Sal marina', 'Básicos', 'Paquete 1 kg', 0.6, 1, 'kg', 0, [], 10],
  ['ing-agua', 'Agua', 'Básicos', 'Litro', 0, 1, 'l', 0, [], 10],
  ['ing-energia-horno', 'Energía de horno (por pieza)', 'Básicos', 'Estimación por hogaza', 0.15, 1, 'ud', 0, [], 21],
  ['ing-cafe', 'Café de especialidad en grano', 'Café', 'Bolsa 1 kg', 22, 1, 'kg', 0, [], 10],
  ['ing-leche', 'Leche entera', 'Lácteos', 'Brik 1 l', 0.95, 1, 'l', 0, ['lácteos'], 4],
  ['ing-avena', 'Bebida de avena barista', 'Lácteos', 'Brik 1 l', 1.6, 1, 'l', 0, ['gluten'], 10],
  ['ing-jamon', 'Jamón serrano loncheado', 'Charcutería', 'Paquete 1 kg', 18, 1, 'kg', 0, [], 10],
  ['ing-tomate', 'Tomate de colgar', 'Fruta y verdura', 'Caja 1 kg', 2.5, 1, 'kg', 30, [], 4],
  ['ing-aove', 'Aceite de oliva virgen extra', 'Básicos', 'Garrafa 5 l', 40, 5, 'l', 0, [], 4],
  ['ing-pollo', 'Pechuga de pollo', 'Carnes', 'Bandeja 1 kg', 7.5, 1, 'kg', 5, [], 10],
  ['ing-pesto', 'Pesto genovés', 'Salsas', 'Bote 1 kg', 14, 1, 'kg', 0, ['lácteos', 'frutos de cáscara'], 10],
  ['ing-rucula', 'Rúcula', 'Fruta y verdura', 'Caja 1 kg', 9, 1, 'kg', 10, [], 4],
  ['ing-garbanzos', 'Garbanzos cocidos', 'Legumbres', 'Bote 2,5 kg', 5, 2.5, 'kg', 0, [], 10],
  ['ing-tahini', 'Tahini', 'Salsas', 'Bote 1 kg', 9, 1, 'kg', 0, ['sésamo'], 10],
  ['ing-limon', 'Limón', 'Fruta y verdura', 'Malla 1 kg', 2, 1, 'kg', 40, [], 4],
  ['ing-ajo', 'Ajo', 'Fruta y verdura', 'Malla 1 kg', 5, 1, 'kg', 15, [], 4],
  ['ing-aguacate', 'Aguacate', 'Fruta y verdura', 'Caja 1 kg', 5, 1, 'kg', 30, [], 4],
  ['ing-huevo', 'Huevo campero', 'Huevos', 'Docena', 3.2, 12, 'ud', 0, ['huevo'], 4],
  ['ing-quinoa', 'Quinoa', 'Cereales', 'Paquete 1 kg', 5, 1, 'kg', 0, [], 10],
  ['ing-verduras', 'Verduras de temporada', 'Fruta y verdura', 'Caja 1 kg', 2.5, 1, 'kg', 20, [], 4],
  ['ing-pescado', 'Pescado del día', 'Pescados', 'Pieza 1 kg', 16, 1, 'kg', 35, ['pescado'], 10],
  ['ing-patata', 'Patata', 'Fruta y verdura', 'Saco 1 kg', 1, 1, 'kg', 20, [], 4],
  ['ing-croquetas', 'Croquetas de jamón artesanas', 'Elaborados', 'Bandeja 1 kg', 12, 1, 'kg', 0, ['gluten', 'lácteos', 'huevo'], 10],
  ['ing-burrata', 'Burrata 125 g', 'Lácteos', 'Unidad', 2.2, 1, 'ud', 0, ['lácteos'], 10],
  ['ing-envase', 'Envase take-away compostable + tapa', 'Packaging', 'Unidad', 0.35, 1, 'ud', 0, [], 21],
  ['ing-agua-botella', 'Agua mineral 50 cl', 'Bebidas', 'Unidad', 0.25, 1, 'ud', 0, [], 10],
  ['ing-cerveza', 'Cerveza de barril', 'Bebidas', 'Barril 30 l', 66, 30, 'l', 5, ['gluten'], 21],
];

export const SEED_INGREDIENTES: Ingrediente[] = RAW_ING.map(
  ([id, nombre, categoria, formato, precioFormato, cantidadFormato, unidad, mermaPct, alergenos, ivaPct]) => ({
    id,
    nombre,
    categoria,
    proveedor: '',
    formato,
    precioFormato,
    cantidadFormato,
    unidad,
    mermaPct,
    alergenos,
    ivaPct,
    notas: '',
  }),
);

type P = [
  id: string,
  nombre: string,
  tipo: Plato['tipo'],
  categoria: string,
  linea: string,
  iva: number,
  fcObj: number,
  pvp: number,
  comps: [string, number][],
  rendimiento?: number,
  unidad?: Unidad,
  peso?: number,
];

const RAW_PLATOS: P[] = [
  // Subrecetas (se usan dentro de otros platos)
  ['sub-masa-madre', 'Masa madre (levain)', 'subreceta', 'Obrador', '', 0, 0, 0, [['ing-harina-integral', 0.5], ['ing-agua', 0.5]], 1, 'kg'],
  ['sub-hogaza', 'Hogaza de masa madre 1 kg', 'subreceta', 'Obrador', '', 0, 0, 0, [['ing-harina-t80', 0.55], ['ing-harina-integral', 0.05], ['ing-sal', 0.012], ['sub-masa-madre', 0.11], ['ing-energia-horno', 1]], 1, 'ud'],
  ['sub-barra', 'Pan de bocadillo de masa madre (250 g)', 'subreceta', 'Obrador', '', 0, 0, 0, [['ing-harina-t80', 0.14], ['ing-sal', 0.003], ['sub-masa-madre', 0.03], ['ing-energia-horno', 0.3]], 1, 'ud'],
  ['sub-hummus', 'Hummus casero', 'subreceta', 'Cocina', '', 0, 0, 0, [['ing-garbanzos', 0.7], ['ing-tahini', 0.12], ['ing-limon', 0.08], ['ing-aove', 0.08], ['ing-ajo', 0.02], ['ing-sal', 0.01]], 1, 'kg'],

  // Cafetería
  ['pl-espresso', 'Espresso', 'plato', 'Cafetería', 'Cafetería', 10, 25, 1.6, [['ing-cafe', 0.009]], 1, 'ud', 3],
  ['pl-cafe-leche', 'Café con leche', 'plato', 'Cafetería', 'Cafetería', 10, 25, 2.2, [['ing-cafe', 0.009], ['ing-leche', 0.15]], 1, 'ud', 4],
  ['pl-flat-white', 'Flat white con bebida de avena', 'plato', 'Cafetería', 'Cafetería', 10, 25, 3.2, [['ing-cafe', 0.018], ['ing-avena', 0.15]], 1, 'ud', 2],
  ['pl-tostada', 'Tostada de masa madre con aguacate y huevo', 'plato', 'Desayunos', 'Cafetería', 10, 30, 6.5, [['sub-hogaza', 0.1], ['ing-aguacate', 0.08], ['ing-huevo', 1], ['ing-aove', 0.01]], 1, 'ud', 2],

  // Panadería
  ['pl-hogaza', 'Hogaza de masa madre 1 kg', 'plato', 'Panadería', 'Panadería', 4, 20, 6.5, [['sub-hogaza', 1]], 1, 'ud', 2],
  ['pl-barra', 'Barra rústica de masa madre', 'plato', 'Panadería', 'Panadería', 4, 20, 2.2, [['sub-barra', 1]], 1, 'ud', 3],

  // Bocatas
  ['pl-boc-jamon', 'Bocata de jamón con tomate', 'plato', 'Bocatas', 'Bocatas', 10, 30, 6.5, [['sub-barra', 1], ['ing-jamon', 0.06], ['ing-tomate', 0.05], ['ing-aove', 0.01]], 1, 'ud', 3],
  ['pl-boc-pollo', 'Bocata de pollo, pesto y rúcula', 'plato', 'Bocatas', 'Bocatas', 10, 30, 7.5, [['sub-barra', 1], ['ing-pollo', 0.1], ['ing-pesto', 0.03], ['ing-rucula', 0.02]], 1, 'ud', 2],
  ['pl-boc-veggie', 'Bocata vegetal con hummus (saludable)', 'plato', 'Saludable', 'Bocatas', 10, 30, 7, [['sub-barra', 1], ['sub-hummus', 0.08], ['ing-verduras', 0.08], ['ing-rucula', 0.02]], 1, 'ud', 2],

  // Take-away
  ['pl-bowl-pollo', 'Bowl de quinoa, pollo y verduras', 'plato', 'Take-away', 'Take-away', 10, 30, 10.5, [['ing-quinoa', 0.08], ['ing-pollo', 0.1], ['ing-verduras', 0.15], ['ing-aove', 0.015], ['ing-envase', 1]], 1, 'ud', 3],
  ['pl-bowl-veggie', 'Bowl veggie de hummus y aguacate', 'plato', 'Saludable', 'Take-away', 10, 30, 10, [['ing-quinoa', 0.08], ['sub-hummus', 0.1], ['ing-verduras', 0.15], ['ing-aguacate', 0.05], ['ing-envase', 1]], 1, 'ud', 2],

  // Cenas
  ['pl-croquetas', 'Croquetas de jamón (6 ud)', 'plato', 'Cenas', 'Cenas', 10, 30, 9, [['ing-croquetas', 0.18]], 1, 'ud', 3],
  ['pl-burrata', 'Burrata con tomate y pan de masa madre', 'plato', 'Cenas', 'Cenas', 10, 30, 13, [['ing-burrata', 1], ['ing-tomate', 0.15], ['ing-aove', 0.015], ['sub-hogaza', 0.1]], 1, 'ud', 2],
  ['pl-pescado', 'Pescado del día con verduras', 'plato', 'Cenas', 'Cenas', 10, 32, 21, [['ing-pescado', 0.25], ['ing-verduras', 0.2], ['ing-aove', 0.02]], 1, 'ud', 2],
  ['pl-bravas', 'Patatas bravas', 'plato', 'Cenas', 'Cenas', 10, 25, 6.5, [['ing-patata', 0.3], ['ing-aove', 0.05]], 1, 'ud', 2],

  // Bebidas
  ['pl-agua', 'Agua mineral 50 cl', 'plato', 'Bebidas', 'Cenas', 10, 20, 2.2, [['ing-agua-botella', 1]], 1, 'ud', 2],
  ['pl-cana', 'Caña de cerveza', 'plato', 'Bebidas', 'Cenas', 10, 25, 2.8, [['ing-cerveza', 0.25]], 1, 'ud', 3],
];

export const SEED_PLATOS: Plato[] = RAW_PLATOS.map(
  ([id, nombre, tipo, categoria, linea, ivaPct, foodCostObjetivoPct, pvp, , rendimiento = 1, unidadRendimiento = 'ud', peso = 1]) => ({
    id,
    nombre,
    tipo,
    categoria,
    linea,
    ivaPct,
    foodCostObjetivoPct,
    pvp,
    rendimiento,
    unidadRendimiento,
    peso,
    activo: true,
    notas: '',
  }),
);

export const SEED_COMPONENTES: Componente[] = RAW_PLATOS.flatMap(([platoId, , , , , , , , comps]) =>
  comps.map(([componenteId, cantidad], i) => ({ id: `${platoId}-c${i + 1}`, platoId, componenteId, cantidad })),
);

export const SEED_FRANJAS: Franja[] = [
  { id: 'fr-desayuno', nombre: 'Desayunos y café (7–11 h)', linea: 'Cafetería', ticketsDia: 50, ticketMedio: 4.2, ivaPct: 10, diasMes: 26, mesInicio: 1, comisionPct: 0.6, notas: '' },
  { id: 'fr-pan', nombre: 'Pan y bollería para llevar', linea: 'Panadería', ticketsDia: 35, ticketMedio: 5, ivaPct: 4, diasMes: 26, mesInicio: 1, comisionPct: 0.6, notas: '' },
  { id: 'fr-mediodia', nombre: 'Mediodía en sala (bocatas, bowls)', linea: 'Bocatas', ticketsDia: 35, ticketMedio: 12, ivaPct: 10, diasMes: 22, mesInicio: 1, comisionPct: 0.6, notas: '' },
  { id: 'fr-takeaway', nombre: 'Take-away para oficinas', linea: 'Take-away', ticketsDia: 20, ticketMedio: 10.5, ivaPct: 10, diasMes: 21, mesInicio: 1, comisionPct: 0.6, notas: 'Si usáis plataformas de delivery, subid la comisión (25–35 %).' },
  { id: 'fr-tarde', nombre: 'Tarde (café y merienda)', linea: 'Cafetería', ticketsDia: 20, ticketMedio: 4.5, ivaPct: 10, diasMes: 26, mesInicio: 1, comisionPct: 0.6, notas: '' },
  { id: 'fr-cenas', nombre: 'Cenas', linea: 'Cenas', ticketsDia: 20, ticketMedio: 24, ivaPct: 10, diasMes: 20, mesInicio: 1, comisionPct: 0.6, notas: 'Podéis retrasar el inicio (mes 4, 6...) si abrís por fases.' },
];
