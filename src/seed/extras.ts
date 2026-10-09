import type { Documento, Local, Tramite } from '../data/types';

export const SEED_LOCALES: Local[] = [
  {
    id: 'loc-ej-1', nombre: 'Ejemplo · Esquina en Eixample con licencia', direccion: '(ejemplo) C/ Aragó', distrito: 'Eixample',
    m2: 120, renta: 3800, traspaso: 45000, fianzaMeses: 2, garantiaMeses: 2, obrasEstimadas: 40000,
    licencia: 'restaurante con cocina', salidaHumos: true, plaUsos: 'pendiente', notaOficinas: 5, notaAfluencia: 4,
    notaVisibilidad: 4, notaEstado: 4, estado: 'visitado', enlace: '', notas: 'Ejemplo: borradlo cuando metáis locales reales.',
  },
  {
    id: 'loc-ej-2', nombre: 'Ejemplo · Bajos en 22@ Poblenou (sin licencia)', direccion: '(ejemplo) C/ Pujades', distrito: 'Sant Martí',
    m2: 140, renta: 3200, traspaso: 0, fianzaMeses: 2, garantiaMeses: 3, obrasEstimadas: 95000,
    licencia: 'ninguna', salidaHumos: false, plaUsos: 'si', notaOficinas: 5, notaAfluencia: 3,
    notaVisibilidad: 3, notaEstado: 2, estado: 'pendiente', enlace: '', notas: 'Ejemplo: mucha oficina, pero hay que hacer salida de humos.',
  },
  {
    id: 'loc-ej-3', nombre: 'Ejemplo · Calle peatonal en Gràcia', direccion: '(ejemplo) C/ Verdi', distrito: 'Gràcia',
    m2: 95, renta: 3000, traspaso: 25000, fianzaMeses: 2, garantiaMeses: 2, obrasEstimadas: 30000,
    licencia: 'bar / cafetería', salidaHumos: false, plaUsos: 'no', notaOficinas: 2, notaAfluencia: 5,
    notaVisibilidad: 5, notaEstado: 3, estado: 'visitado', enlace: '', notas: "Ejemplo: el Pla d'usos no permite ampliar a restaurante.",
  },
];

type R = [id: string, categoria: string, nombre: string, organismo: string, tareaId: string, coste?: number, notas?: string];

const RAW_TRAMITES: R[] = [
  ['tr-cb', 'Empresa', 'Contrato de comunidad de bienes y pacto de socios', 'Gestoría / abogado', 'pacto', 0, 'Aportaciones, dedicación, salida de un socio, decisiones y pérdidas.'],
  ['tr-036', 'Empresa', 'Alta censal de la CB en Hacienda (modelo 036) y CIF', 'Agencia Tributaria', 'alta-hacienda'],
  ['tr-reta', 'Empresa', 'Alta de los socios en autónomos (RETA) con tarifa plana', 'Seguridad Social', 'alta-hacienda', 0, 'Pedir la tarifa plana en el mismo momento del alta.'],
  ['tr-ccc', 'Empresa', 'Inscripción como empresa (código de cuenta de cotización)', 'Seguridad Social', 'contratos', 0, 'Necesario antes de contratar al primer empleado.'],
  ['tr-plausos', 'Local y licencias', "Consulta de compatibilidad urbanística / Pla d'usos del distrito", 'Ajuntament de Barcelona (districte)', 'verificar-local'],
  ['tr-proyecto', 'Local y licencias', 'Proyecto técnico de actividad', 'Arquitecto / ingeniero', 'proyecto-tecnico'],
  ['tr-obras', 'Local y licencias', 'Licencia o comunicado de obras', 'Ajuntament de Barcelona', 'solicitud-licencia'],
  ['tr-actividad', 'Local y licencias', 'Licencia / comunicación previa de la actividad', 'Ajuntament de Barcelona (OAE)', 'tramitacion-licencia'],
  ['tr-certificados', 'Local y licencias', 'Certificados de instalaciones (eléctrica, gas, clima, PCI)', 'Instaladores autorizados', 'certificado-final'],
  ['tr-terraza', 'Local y licencias', 'Licencia de terraza (opcional)', 'Ajuntament de Barcelona', 'terraza'],
  ['tr-sanidad', 'Sanidad', 'Comunicación sanitaria / registro (RSIPAC si vendéis a otros negocios)', 'ASPB / Generalitat', 'registro-sanitario'],
  ['tr-appcc', 'Sanidad', 'Plan APPCC (autocontrol)', 'Consultora / interno', 'appcc'],
  ['tr-manipuladores', 'Sanidad', 'Formación de manipuladores de alimentos', 'Centro de formación', 'formacion'],
  ['tr-alergenos', 'Sanidad', 'Carta con los 14 alérgenos declarados', 'Interno', 'carta'],
  ['tr-plagas', 'Sanidad', 'Contrato de control de plagas (DDD)', 'Empresa autorizada', 'limpieza'],
  ['tr-residuos', 'Sanidad', 'Gestor de aceite usado y residuos', 'Gestor autorizado', 'limpieza'],
  ['tr-catalan', 'Consumo', 'Rotulación e información al cliente (al menos en catalán)', 'Interno', 'rotulo'],
  ['tr-reclamaciones', 'Consumo', 'Hojas de reclamación oficiales y cartel', 'Agència Catalana del Consum', 'soft-opening'],
  ['tr-carteles', 'Consumo', 'Carteles obligatorios (horario, precios, tabaco, alcohol a menores)', 'Interno', 'soft-opening'],
  ['tr-prl', 'Laboral', 'Prevención de riesgos laborales (servicio ajeno)', 'Servicio de prevención', 'contratos'],
  ['tr-jornada', 'Laboral', 'Registro de jornada y protección de datos (RGPD)', 'Gestoría', 'contratos'],
  ['tr-seguros', 'Otros', 'Seguro de responsabilidad civil y multirriesgo', 'Aseguradora', 'seguros'],
  ['tr-sgae', 'Otros', 'Licencia de música ambiental (SGAE / entidades)', 'SGAE', 'soft-opening'],
  ['tr-oepm', 'Otros', 'Registro de marca', 'OEPM', 'marca'],
  ['tr-envases', 'Otros', 'Envases para llevar según la Ley 7/2022 de residuos', 'Interno', 'proveedores'],
];

export const SEED_TRAMITES: Tramite[] = RAW_TRAMITES.map(([id, categoria, nombre, organismo, tareaId, coste = 0, notas = '']) => ({
  id,
  categoria,
  nombre,
  organismo,
  estado: 'pendiente',
  responsable: '',
  fechaLimite: '',
  coste,
  tareaId,
  enlace: '',
  notas,
}));

export const SEED_DOCUMENTOS: Documento[] = [
  { id: 'doc-drive', titulo: 'Carpeta del proyecto en Google Drive', categoria: 'General', url: '', vinculo: '', fecha: '', notas: 'Pegad aquí el enlace a vuestra carpeta compartida.' },
  { id: 'doc-ajuntament', titulo: "Ajuntament de Barcelona (planes de usos y licencias)", categoria: 'Normativa', url: 'https://ajuntament.barcelona.cat', vinculo: 'Trámites', fecha: '', notas: '' },
  { id: 'doc-bcnactiva', titulo: 'Barcelona Activa (asesoramiento para emprender)', categoria: 'Financiación', url: 'https://www.barcelonactiva.cat', vinculo: 'Financiación', fecha: '', notas: '' },
  { id: 'doc-dogc', titulo: "Conveni d'hostaleria de Catalunya (DOGC)", categoria: 'Normativa', url: 'https://dogc.gencat.cat', vinculo: 'RRHH', fecha: '2026-03-23', notas: 'DOGC 9630.' },
];
