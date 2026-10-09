import { useData } from '../state/DataContext';
import { PageShell, ProgressBar, Stat } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { Tramite } from '../data/types';
import { diffDays, formatDate } from '../lib/dates';
import { eur, uid } from '../lib/format';

export function TramitesPage() {
  const { db, derived: d, setTable, readOnly } = useData();
  const total = db.Tramites.length;
  const hechos = db.Tramites.filter((t) => t.estado === 'hecho' || t.estado === 'no aplica').length;
  const fecha = (t: Tramite) => t.fechaLimite || (t.tareaId ? d.schedule.byId.get(t.tareaId)?.ls ?? '' : '');
  const pendientes = db.Tramites.filter((t) => t.estado !== 'hecho' && t.estado !== 'no aplica');
  const vencidos = pendientes.filter((t) => fecha(t) && fecha(t) < d.today);
  const proximos = pendientes.filter((t) => fecha(t) && fecha(t) >= d.today && diffDays(fecha(t), d.today) <= 30);
  const coste = db.Tramites.reduce((s, t) => s + (t.coste || 0), 0);
  const taskOptions = [{ value: '', label: '—' }, ...db.Tareas.map((t) => ({ value: t.id, label: t.nombre }))];

  const columns: Column<Tramite>[] = [
    {
      key: 'estado', label: 'Estado', type: 'select', width: 120,
      options: [
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'en curso', label: 'En curso' },
        { value: 'hecho', label: 'Hecho' },
        { value: 'no aplica', label: 'No aplica' },
      ],
    },
    { key: 'nombre', label: 'Trámite', width: 320 },
    { key: 'organismo', label: 'Dónde / quién', width: 190 },
    { key: 'responsable', label: 'Responsable', width: 110 },
    { key: 'tareaId', label: 'Tarea del cronograma', type: 'select', options: taskOptions, width: 200 },
    { key: 'fechaLimite', label: 'Fecha límite', type: 'date', width: 140, title: 'Si la dejas vacía se usa la fecha límite de la tarea vinculada' },
    {
      key: 'limite', label: 'Límite efectivo', type: 'computed', width: 110,
      render: (t) => {
        const f = fecha(t);
        if (!f) return <span className="muted">—</span>;
        const done = t.estado === 'hecho' || t.estado === 'no aplica';
        const tone = done ? '' : f < d.today ? 'bad' : diffDays(f, d.today) <= 30 ? 'warn' : '';
        return <span className={`pill ${tone}`}>{formatDate(f)}</span>;
      },
    },
    { key: 'coste', label: 'Coste', type: 'money', width: 100 },
    { key: 'categoria', label: 'Categoría', options: Array.from(new Set(db.Tramites.map((t) => t.categoria))), width: 150 },
    { key: 'enlace', label: 'Enlace', width: 160 },
    { key: 'notas', label: 'Notas', width: 260 },
  ];

  return (
    <PageShell moduleId="tramites" title="Trámites y licencias" subtitle="Lo que hay que tener en regla para abrir en Barcelona. Vincúlalos al cronograma para saber cuándo tocan.">
      <div className="stats">
        <Stat label="Completados" value={`${hechos}/${total}`} sub={<ProgressBar value={(hechos / Math.max(1, total)) * 100} tone="ok" />} />
        <Stat label="Vencidos" value={`${vencidos.length}`} tone={vencidos.length ? 'bad' : 'ok'} sub={vencidos.slice(0, 2).map((t) => t.nombre).join(', ') || 'ninguno'} />
        <Stat label="Próximos 30 días" value={`${proximos.length}`} tone={proximos.length ? 'warn' : undefined} />
        <Stat label="Coste de trámites" value={eur(coste)} sub="informativo (la inversión va en Presupuesto)" />
      </div>
      <EditableTable<Tramite>
        rows={db.Tramites}
        columns={columns}
        onChange={(rows) => setTable('Tramites', rows)}
        readOnly={readOnly}
        groupBy={(t) => t.categoria || 'Otros'}
        rowClassName={(t) => (t.estado === 'hecho' || t.estado === 'no aplica' ? 'done' : '')}
        onAddToGroup={(g) => setTable('Tramites', [...db.Tramites, nuevo(g)])}
        newRow={() => nuevo('Otros')}
        addLabel="Añadir trámite"
      />
      <div className="tip" style={{ marginTop: 12 }}>
        Lista orientativa: cada caso concreto depende del local (licencia existente, aforo, terraza, si vendéis pan a otros negocios…). La Oficina d'Atenció a
        les Empreses (OAE) del Ajuntament y Barcelona Activa os pueden confirmar qué aplica.
      </div>
    </PageShell>
  );
}

function nuevo(categoria: string): Tramite {
  return { id: uid('tr'), categoria, nombre: 'Nuevo trámite', organismo: '', estado: 'pendiente', responsable: '', fechaLimite: '', coste: 0, tareaId: '', enlace: '', notas: '' };
}
