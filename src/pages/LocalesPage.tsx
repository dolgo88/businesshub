import { useData } from '../state/DataContext';
import { Card, Field, NumberInput, PageShell, ProgressBar, Stat } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { EstadoLocal, Local } from '../data/types';
import { LICENCIAS } from '../domain/locales';
import { eur, eurShort, num, uid } from '../lib/format';
import type { Settings } from '../data/settings';

const PESOS: { key: keyof Settings; label: string }[] = [
  { key: 'pesoPrecio', label: 'Coste del primer año' },
  { key: 'pesoLicencia', label: 'Licencia que trae' },
  { key: 'pesoHumos', label: 'Salida de humos' },
  { key: 'pesoPlaUsos', label: "Pla d'usos permite la actividad" },
  { key: 'pesoOficinas', label: 'Oficinas cerca' },
  { key: 'pesoAfluencia', label: 'Afluencia de gente' },
  { key: 'pesoVisibilidad', label: 'Visibilidad / fachada' },
  { key: 'pesoEstado', label: 'Estado del local' },
];

export function LocalesPage() {
  const { db, derived: d, setTable, updateSettings, readOnly, notify } = useData();
  const scores = new Map(d.locales.map((s) => [s.local.id, s]));
  const ranking = d.locales.filter((s) => s.local.estado !== 'descartado').sort((a, b) => b.puntuacion - a.puntuacion);
  const best = ranking[0];

  const elegir = (l: Local) => {
    if (!window.confirm(`Elegir «${l.nombre}»: se actualizarán el alquiler, la fianza, la garantía y el traspaso en el Presupuesto, y se marcará la búsqueda de local como hecha. ¿Continuar?`)) return;
    setTable('Locales', db.Locales.map((x) => ({ ...x, estado: (x.id === l.id ? 'elegido' : x.estado === 'elegido' ? 'visitado' : x.estado) as EstadoLocal })));
    setTable('GastosFijos', (prev) => {
      const has = prev.some((g) => g.id === 'gf-alquiler');
      const row = { id: 'gf-alquiler', categoria: 'Local', concepto: `Alquiler (${l.nombre})`, importeMensual: l.renta, ivaPct: 21, notas: l.direccion };
      return has ? prev.map((g) => (g.id === 'gf-alquiler' ? { ...g, importeMensual: l.renta, concepto: row.concepto } : g)) : [...prev, row];
    });
    setTable('Inversion', (prev) => {
      const upsert = (list: typeof prev, id: string, concepto: string, cantidad: number, precio: number, iva: number, amort = 0) => {
        const found = list.some((p) => p.id === id);
        if (found) return list.map((p) => (p.id === id ? { ...p, cantidad, precioUnit: precio } : p));
        return [...list, { id, categoria: 'Local', concepto, cantidad, precioUnit: precio, ivaPct: iva, modo: 'compra' as const, cuotaMensual: 0, amortAnios: amort, estado: 'estimado' as const, tareaId: 'firma-local', proveedor: '', notas: '' }];
      };
      let next = upsert(prev, 'inv-fianza', 'Fianza legal', l.fianzaMeses, l.renta, 0);
      next = upsert(next, 'inv-garantia', 'Garantía adicional / aval', l.garantiaMeses, l.renta, 0);
      next = upsert(next, 'inv-traspaso', 'Traspaso', 1, l.traspaso, 21, 10);
      next = next.map((p) => (p.id === 'inv-renta-obras' ? { ...p, precioUnit: l.renta } : p));
      return next;
    });
    setTable('Tareas', (prev) => prev.map((t) => (['estudio-zona', 'busqueda-local'].includes(t.id) && !t.hecho ? { ...t, hecho: true, fechaHecho: d.today } : t)));
    notify('Local elegido: presupuesto y cronograma actualizados.', 'ok');
  };

  const columns: Column<Local>[] = [
    {
      key: 'puntuacion', label: 'Nota', type: 'computed', width: 110,
      render: (l) => {
        const s = scores.get(l.id);
        if (!s || l.estado === 'descartado') return <span className="muted">—</span>;
        return (
          <div>
            <span className="score">{num(s.puntuacion)}</span>
            <div className="score-bar"><ProgressBar value={s.puntuacion} tone={s.puntuacion >= 70 ? 'ok' : s.puntuacion >= 50 ? 'warn' : 'bad'} /></div>
          </div>
        );
      },
    },
    { key: 'nombre', label: 'Local', width: 230 },
    { key: 'distrito', label: 'Distrito', width: 120, options: ['Ciutat Vella', 'Eixample', 'Sants-Montjuïc', 'Les Corts', 'Sarrià-Sant Gervasi', 'Gràcia', 'Horta-Guinardó', 'Nou Barris', 'Sant Andreu', 'Sant Martí'] },
    { key: 'direccion', label: 'Dirección', width: 170 },
    { key: 'm2', label: 'm²', type: 'number', decimals: 0, width: 70 },
    { key: 'renta', label: 'Renta/mes', type: 'money', width: 105 },
    { key: 'rentaM2', label: '€/m²', type: 'computed', align: 'right', width: 70, render: (l) => (l.m2 ? num(l.renta / l.m2, 1) : '—') },
    { key: 'traspaso', label: 'Traspaso', type: 'money', width: 105 },
    { key: 'fianzaMeses', label: 'Fianza (meses)', type: 'number', decimals: 0, width: 80 },
    { key: 'garantiaMeses', label: 'Garantía (meses)', type: 'number', decimals: 0, width: 85 },
    { key: 'obrasEstimadas', label: 'Obras estimadas', type: 'money', width: 115 },
    { key: 'coste', label: 'Coste 1er año', type: 'computed', align: 'right', width: 110, render: (l) => eurShort(scores.get(l.id)?.costePrimerAnio ?? 0) },
    { key: 'licencia', label: 'Licencia actual', type: 'select', options: LICENCIAS, width: 170 },
    { key: 'salidaHumos', label: 'Salida humos', type: 'bool', width: 70 },
    { key: 'plaUsos', label: "Pla d'usos", type: 'select', options: [{ value: 'si', label: 'Permite' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'no', label: 'No permite' }], width: 115 },
    { key: 'notaOficinas', label: 'Oficinas (1-5)', type: 'number', decimals: 0, width: 80 },
    { key: 'notaAfluencia', label: 'Afluencia (1-5)', type: 'number', decimals: 0, width: 80 },
    { key: 'notaVisibilidad', label: 'Visibilidad (1-5)', type: 'number', decimals: 0, width: 80 },
    { key: 'notaEstado', label: 'Estado (1-5)', type: 'number', decimals: 0, width: 80 },
    {
      key: 'estado', label: 'Situación', type: 'select', width: 120,
      options: [
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'visitado', label: 'Visitado' },
        { value: 'negociando', label: 'Negociando' },
        { value: 'descartado', label: 'Descartado' },
        { value: 'elegido', label: 'Elegido' },
      ],
    },
    { key: 'enlace', label: 'Enlace (anuncio, fotos)', width: 180 },
    { key: 'notas', label: 'Notas', width: 220 },
  ];

  return (
    <PageShell moduleId="locales" subtitle="Comparad locales candidatos con los mismos criterios. La nota pondera coste, licencia, salida de humos, Pla d'usos y ubicación.">
      <div className="stats">
        <Stat label="Candidatos" value={`${ranking.length}`} sub={`${db.Locales.length - ranking.length} descartados`} />
        {best && <Stat label="Mejor puntuado" value={num(best.puntuacion)} sub={best.local.nombre} tone="ok" />}
        {best && <Stat label="Entrada (mejor puntuado)" value={eurShort(best.entrada)} sub="traspaso + fianza + garantía" />}
        {best && <Stat label="Coste 1er año (mejor)" value={eurShort(best.costePrimerAnio)} sub="rentas + entrada + obras" />}
      </div>

      <EditableTable<Local>
        rows={db.Locales}
        columns={columns}
        onChange={(rows) => setTable('Locales', rows)}
        readOnly={readOnly}
        rowClassName={(l) => (l.estado === 'descartado' ? 'done' : '')}
        rowActions={(l) =>
          l.estado !== 'elegido' && l.estado !== 'descartado' ? (
            <button className="btn small" onClick={() => elegir(l)} title="Pasar renta, fianza y traspaso al presupuesto">
              Elegir
            </button>
          ) : l.estado === 'elegido' ? (
            <span className="pill ok">Elegido</span>
          ) : null
        }
        newRow={() => ({
          id: uid('loc'), nombre: 'Nuevo local', direccion: '', distrito: '', m2: 100, renta: 0, traspaso: 0, fianzaMeses: 2, garantiaMeses: 2,
          obrasEstimadas: 0, licencia: 'ninguna', salidaHumos: false, plaUsos: 'pendiente', notaOficinas: 3, notaAfluencia: 3, notaVisibilidad: 3,
          notaEstado: 3, estado: 'pendiente', enlace: '', notas: '',
        })}
        addLabel="Añadir local"
      />

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Card title="Importancia de cada criterio (0–5)">
          <div className="form-grid">
            {PESOS.map((p) => (
              <Field key={p.key} label={p.label}>
                <NumberInput value={d.settings[p.key] as number} decimals={0} onChange={(n) => updateSettings({ [p.key]: Math.max(0, Math.min(5, n)) })} disabled={readOnly} />
              </Field>
            ))}
          </div>
        </Card>
        <Card title="Antes de firmar">
          <div className="tip">
            <ul>
              <li>Consulta urbanística en el distrito: ¿el Pla d'usos admite restaurante con cocina y obrador en esa dirección?</li>
              <li>¿Tiene o admite salida de humos a cubierta? Sin ella no hay cocina ni horno de pan.</li>
              <li>Potencia eléctrica disponible (horno, cámaras, cafetera) y acometida de gas.</li>
              <li>Licencia actual en vigor y transmisible (cambio de titularidad) si hay traspaso.</li>
              <li>Accesibilidad (baño adaptado, escalones), aforo y salidas de emergencia.</li>
              <li>Contrato: carencia de renta durante las obras, cláusula de condición de licencia, duración y actualizaciones.</li>
              <li>Fianza legal: 2 mensualidades (uso distinto de vivienda) + garantías adicionales que se negocien.</li>
            </ul>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Al «Elegir» un local, su renta, fianza, garantía y traspaso pasan al Presupuesto ({eur(d.budget.gastosFijosMensual)} de gastos fijos actuales).
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
