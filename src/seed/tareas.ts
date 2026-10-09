import type { Tarea } from '../data/types';

type T = [id: string, fase: string, nombre: string, duracion: number, deps: string[], responsable?: string, notas?: string];

// Plantilla de apertura de un café-panadería-restaurante en Barcelona.
// Duraciones en días naturales, orientativas: ajustadlas a vuestra realidad.
const RAW: T[] = [
  ['concepto', '1. Concepto y plan', 'Definir concepto, carta preliminar y plan de negocio', 21, []],
  ['asesoria', '1. Concepto y plan', 'Asesoramiento (Barcelona Activa / gestoría)', 14, [], '', 'Barcelona Activa asesora gratis en plan de empresa y financiación.'],
  ['pacto', '1. Concepto y plan', 'Pacto de socios y contrato de la comunidad de bienes', 14, ['asesoria']],

  ['plan-financiero', '2. Financiación', 'Plan financiero y dossier para bancos', 10, ['concepto']],
  ['solicitud-prestamo', '2. Financiación', 'Solicitar préstamos y ayudas (MicroBank, ENISA, Avalis, pago único)', 30, ['plan-financiero']],
  ['firma-prestamo', '2. Financiación', 'Firma del préstamo', 7, ['solicitud-prestamo', 'firma-local']],

  ['estudio-zona', '3. Local', 'Estudio de zonas (oficinas, flujo de gente, competencia)', 14, []],
  ['busqueda-local', '3. Local', 'Búsqueda y visitas de locales', 45, ['estudio-zona']],
  ['verificar-local', '3. Local', "Verificar Pla d'usos, licencia y salida de humos", 10, ['busqueda-local'], '', 'Consulta urbanística en el distrito antes de firmar.'],
  ['negociar-local', '3. Local', 'Negociar contrato (carencia, condición de licencia)', 14, ['verificar-local']],
  ['firma-local', '3. Local', 'Firma del contrato de alquiler / traspaso', 3, ['negociar-local']],

  ['alta-hacienda', '4. Legal y licencias', 'Alta en Hacienda (CIF de la CB) y RETA de los socios', 5, ['pacto']],
  ['proyecto-tecnico', '4. Legal y licencias', 'Proyecto técnico de actividad y obras', 30, ['firma-local']],
  ['solicitud-licencia', '4. Legal y licencias', 'Presentar licencia / comunicación de actividad y obras', 5, ['proyecto-tecnico']],
  ['tramitacion-licencia', '4. Legal y licencias', 'Tramitación de la licencia en el Ajuntament', 45, ['solicitud-licencia']],
  ['appcc', '4. Legal y licencias', 'Plan APPCC y formación de manipuladores', 14, ['proyecto-tecnico']],
  ['seguros', '4. Legal y licencias', 'Contratar seguros (RC y multirriesgo)', 5, ['firma-local']],
  ['terraza', '4. Legal y licencias', 'Licencia de terraza (opcional)', 60, ['firma-local']],
  ['registro-sanitario', '4. Legal y licencias', 'Comunicación sanitaria (ASPB) / registro sanitario', 14, ['certificado-final']],

  ['presupuestos-obra', '5. Obras e instalaciones', 'Pedir 3 presupuestos de obra e instalaciones', 14, ['proyecto-tecnico']],
  ['obras', '5. Obras e instalaciones', 'Obras (albañilería, fontanería, electricidad, clima)', 60, ['presupuestos-obra', 'solicitud-licencia']],
  ['salida-humos', '5. Obras e instalaciones', 'Salida de humos y campana de extracción', 20, ['presupuestos-obra', 'solicitud-licencia']],
  ['suministros', '5. Obras e instalaciones', 'Altas de luz (potencia), agua, gas e internet', 21, ['firma-local']],
  ['certificado-final', '5. Obras e instalaciones', 'Certificados finales de obra e instalaciones', 7, ['obras', 'salida-humos']],

  ['elegir-maquinaria', '6. Equipamiento', 'Elegir maquinaria (cocina, café, obrador) y pedir presupuestos', 21, ['concepto']],
  ['acuerdo-cafe', '6. Equipamiento', 'Acuerdo con tostador (cafetera en comodato) y cervecera', 21, ['concepto']],
  ['pedido-maquinaria', '6. Equipamiento', 'Pedido de maquinaria (plazo de entrega)', 45, ['elegir-maquinaria', 'firma-local']],
  ['instalacion-maquinaria', '6. Equipamiento', 'Instalación de maquinaria y pruebas', 10, ['pedido-maquinaria', 'obras']],
  ['mobiliario', '6. Equipamiento', 'Mobiliario, menaje y decoración', 30, ['firma-local']],
  ['tpv', '6. Equipamiento', 'TPV, software, wifi y música', 7, ['obras']],

  ['proveedores', '7. Proveedores y menú', 'Seleccionar proveedores (harina, café, fresco, packaging)', 21, ['concepto']],
  ['recetas', '7. Proveedores y menú', 'Pruebas de recetas, masa madre y escandallos', 30, ['concepto']],
  ['carta', '7. Proveedores y menú', 'Carta final con alérgenos y precios (en catalán)', 7, ['recetas', 'proveedores']],

  ['puestos', '8. Equipo', 'Definir puestos, turnos y presupuesto de personal', 7, ['concepto']],
  ['seleccion', '8. Equipo', 'Selección de personal', 21, ['puestos', 'firma-local']],
  ['contratos', '8. Equipo', 'Contratos, altas en Seguridad Social y PRL', 7, ['seleccion']],
  ['formacion', '8. Equipo', 'Formación del equipo', 10, ['contratos', 'instalacion-maquinaria']],

  ['marca', '9. Marca y marketing', 'Nombre, logo y registro de marca (OEPM)', 30, ['concepto']],
  ['rotulo', '9. Marca y marketing', 'Rótulo exterior (en catalán) y señalética', 21, ['marca', 'solicitud-licencia']],
  ['digital', '9. Marca y marketing', 'Web, redes y ficha de Google', 21, ['marca']],
  ['b2b', '9. Marca y marketing', 'Contactar oficinas cercanas (pedidos de empresa)', 21, ['firma-local', 'carta']],

  ['stock', '10. Apertura', 'Pedido de stock inicial', 5, ['carta', 'instalacion-maquinaria']],
  ['limpieza', '10. Apertura', 'Limpieza final y montaje', 3, ['certificado-final', 'instalacion-maquinaria', 'mobiliario']],
  ['soft-opening', '10. Apertura', 'Soft opening (amigos, vecinos, oficinas)', 7, ['stock', 'formacion', 'tramitacion-licencia', 'registro-sanitario', 'limpieza', 'tpv']],
  ['kickoff', '10. Apertura', 'KICK-OFF: apertura al público', 0, ['soft-opening']],
];

export const SEED_TAREAS: Tarea[] = RAW.map(([id, fase, nombre, duracion, dependencias, responsable = '', notas = '']) => ({
  id,
  fase,
  nombre,
  responsable,
  duracion,
  dependencias,
  inicioFijo: '',
  hecho: false,
  fechaHecho: '',
  notas,
}));
