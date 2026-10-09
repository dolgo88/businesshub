import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../state/DataContext';
import { Alert, Card, DateInput, PageShell, Stat, Tabs, useTab } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { ScheduledTask } from '../domain/schedule';
import { KICKOFF_ID } from '../domain/schedule';
import type { Tarea } from '../data/types';
import { addDays, diffDays, formatDate, monthLabel, toDay, fromDay, addMonths, monthKey } from '../lib/dates';
import { eur, eurShort, uid } from '../lib/format';

type TabId = 'gantt' | 'tareas' | 'costes';

export function CronogramaPage() {
  const { db, derived: d, setTable, updateSettings, readOnly } = useData();
  const [tab, setTab] = useTab<TabId>('cronograma', 'gantt');
  const s = d.schedule;
  const late = s.delayDays > 0;
  const costeTotal = [...d.costByTask.values()].reduce((a, b) => a + b, 0);
  const phases = useMemo(() => Array.from(new Set(db.Tareas.map((t) => t.fase))), [db.Tareas]);

  const saveTareas = (rows: Tarea[]) => {
    const ids = new Set(rows.map((r) => r.id));
    setTable(
      'Tareas',
      rows.map((r) => {
        let next = r;
        if (r.hecho && !r.fechaHecho) next = { ...next, fechaHecho: d.today };
        if (!r.hecho && r.fechaHecho) next = { ...next, fechaHecho: '' };
        if (r.dependencias.some((x) => !ids.has(x))) next = { ...next, dependencias: r.dependencias.filter((x) => ids.has(x)) };
        return next;
      }),
    );
  };

  const toggleDone = (id: string, hecho: boolean) => saveTareas(db.Tareas.map((t) => (t.id === id ? { ...t, hecho } : t)));

  return (
    <PageShell
      moduleId="cronograma"
      actions={
        <label className="field" style={{ minWidth: 170 }}>
          <span>Kick-off objetivo</span>
          <DateInput value={d.settings.fechaKickoff} onChange={(v) => v && updateSettings({ fechaKickoff: v })} disabled={readOnly} />
        </label>
      }
    >
      <div className="stats">
        <Stat label="Kick-off objetivo" value={formatDate(s.target)} sub={`Faltan ${diffDays(s.target, d.today)} días`} />
        <Stat
          label="Apertura prevista"
          value={formatDate(s.projectedOpening)}
          sub={late ? `${s.delayDays} días tarde` : `${-s.delayDays} días de margen`}
          tone={late ? 'bad' : 'ok'}
        />
        <Stat label="Progreso" value={`${s.done}/${s.total}`} sub={`${Math.round((s.done / Math.max(1, s.total)) * 100)} % de tareas hechas`} tone="info" />
        <Stat label="Coste vinculado a tareas" value={eurShort(costeTotal)} sub="con IVA, desde Presupuesto" />
      </div>

      {s.cycle.length > 0 && (
        <Alert tone="bad" title="Hay dependencias circulares">
          <p>Revisa estas tareas: {s.cycle.map((id) => s.byId.get(id)?.nombre ?? id).join(', ')}.</p>
        </Alert>
      )}

      {late ? (
        <Alert
          tone="bad"
          title={`Kick-off en riesgo: con las duraciones actuales abriríais el ${formatDate(s.projectedOpening)} (+${s.delayDays} días).`}
          action={
            !readOnly && (
              <button className="btn small" onClick={() => updateSettings({ fechaKickoff: s.projectedOpening })}>
                Mover kick-off al {formatDate(s.projectedOpening)}
              </button>
            )
          }
        >
          <p>
            Camino crítico (lo que marca la fecha): {s.criticalPath.filter((t) => t.id !== KICKOFF_ID).map((t) => `${t.nombre} (${t.duracion} d)`).join(' → ')}.
          </p>
          <p className="muted">
            Para llegar: acortad tareas críticas (p. ej. un local con licencia o traspaso ahorra proyecto y obras), quitad dependencias que en
            realidad pueden ir en paralelo, o fijad fechas de inicio anteriores en tareas ya en marcha.
          </p>
        </Alert>
      ) : (
        <Alert tone="ok" title={`El plan llega al kick-off con ${-s.delayDays} días de margen.`}>
          <p className="muted">Vigilad las tareas críticas: si alguna se retrasa, se retrasa la apertura.</p>
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'gantt', label: 'Diagrama' },
          { id: 'tareas', label: 'Editar tareas' },
          { id: 'costes', label: 'Costes y caja por etapa' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'gantt' && <Gantt tasks={s.tasks} today={d.today} target={s.target} projected={s.projectedOpening} onToggle={toggleDone} readOnly={readOnly} costByTask={d.costByTask} />}

      {tab === 'tareas' && (
        <TaskTable tasks={s.tasks} phases={phases} onChange={saveTareas} readOnly={readOnly} costByTask={d.costByTask} />
      )}

      {tab === 'costes' && (
        <div className="grid cols-2">
          <Card title="Coste por etapa">
            <div className="table-wrap">
              <table className="data static">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th className="right">Tareas</th>
                    <th>Fechas previstas</th>
                    <th className="right">Coste (con IVA)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.phases.map((p) => (
                    <tr key={p.fase}>
                      <td>{p.fase}</td>
                      <td className="right num">
                        {p.hechas}/{p.tareas}
                      </td>
                      <td className="nowrap">
                        {formatDate(p.inicio)} – {formatDate(p.fin)}
                      </td>
                      <td className="right num">{eur(p.coste)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total vinculado a tareas</td>
                    <td className="right num">{eur(costeTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Cada partida del Presupuesto se vincula a una tarea; así sabéis cuánto cuesta cada etapa y cuándo hay que pagarla.
            </p>
          </Card>
          <Card title="Necesidad de caja antes de abrir">
            <div className="chart-box">
              <ResponsiveContainer>
                <ComposedChart data={d.cashNeeds.map((c) => ({ ...c, label: monthLabel(c.month) }))} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <YAxis tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 12, fill: 'var(--muted)' }} width={70} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }} />
                  <Bar dataKey="importe" name="Pagos del mes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Line dataKey="acumulado" name="Acumulado" stroke="var(--info)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Pagos (con IVA) según la fecha prevista de la tarea vinculada. Las partidas sin tarea se colocan el mes anterior al kick-off.
            </p>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function TaskTable({
  tasks,
  phases,
  onChange,
  readOnly,
  costByTask,
}: {
  tasks: ScheduledTask[];
  phases: string[];
  onChange: (rows: Tarea[]) => void;
  readOnly: boolean;
  costByTask: Map<string, number>;
}) {
  const options = tasks.map((t) => ({ value: t.id, label: t.nombre }));
  const columns: Column<ScheduledTask>[] = [
    { key: 'hecho', label: '✓', type: 'bool', width: 36, title: 'Hecho' },
    { key: 'nombre', label: 'Tarea', width: 280 },
    { key: 'fase', label: 'Etapa', options: phases, width: 170 },
    { key: 'responsable', label: 'Responsable', width: 110 },
    { key: 'duracion', label: 'Días', type: 'number', decimals: 0, width: 70 },
    { key: 'dependencias', label: 'Depende de', type: 'multi', options: (row) => options.filter((o) => o.value !== row.id), width: 220 },
    { key: 'inicioFijo', label: 'Inicio fijo', type: 'date', width: 140, title: 'Opcional: fija el inicio. Las tareas dependientes se desplazan solas.' },
    { key: 'es', label: 'Inicio previsto', type: 'computed', render: (t) => formatDate(t.es), width: 100 },
    { key: 'ef', label: 'Fin', type: 'computed', render: (t) => (t.hecho && t.fechaHecho ? `✓ ${formatDate(t.fechaHecho)}` : formatDate(t.ef)), width: 100 },
    {
      key: 'ls',
      label: 'Empezar antes de',
      type: 'computed',
      title: 'Última fecha de inicio para llegar al kick-off objetivo',
      render: (t) => (t.hecho ? '—' : <span style={{ color: t.slack < 0 ? 'var(--bad)' : undefined, fontWeight: t.critical ? 600 : 400 }}>{formatDate(t.ls)}</span>),
      width: 110,
    },
    {
      key: 'slack',
      label: 'Holgura',
      type: 'computed',
      align: 'right',
      render: (t) => (t.hecho ? '—' : <span className={`pill ${t.slack < 0 ? 'bad' : t.critical ? 'warn' : 'ok'}`}>{t.slack} d</span>),
      width: 80,
    },
    { key: 'coste', label: 'Coste', type: 'computed', align: 'right', render: (t) => (costByTask.get(t.id) ? eurShort(costByTask.get(t.id)!) : ''), width: 80 },
    { key: 'notas', label: 'Notas', width: 200 },
  ];
  return (
    <EditableTable<ScheduledTask>
      rows={tasks}
      columns={columns}
      readOnly={readOnly}
      groupBy={(t) => t.fase}
      rowClassName={(t) => `${t.hecho ? 'done' : ''} ${t.critical ? 'critical' : ''}`}
      onChange={(rows) => onChange(rows.map(stripSchedule))}
      newRow={() => ({
        ...schedulePlaceholder(),
        id: uid('t'),
        fase: phases[phases.length - 2] ?? phases[0] ?? 'Nueva etapa',
        nombre: 'Nueva tarea',
        duracion: 7,
      })}
      addLabel="Añadir tarea"
      confirmDelete={(t) => (t.id === KICKOFF_ID ? 'Esta es la tarea final de apertura. ¿Seguro que quieres borrarla?' : `¿Eliminar «${t.nombre}»?`)}
    />
  );
}

function schedulePlaceholder(): ScheduledTask {
  return {
    id: '', fase: '', nombre: '', responsable: '', duracion: 0, dependencias: [], inicioFijo: '', hecho: false, fechaHecho: '', notas: '',
    es: '', ef: '', ls: '', lf: '', slack: 0, critical: false, fixedConflict: false,
  };
}

function stripSchedule(t: ScheduledTask): Tarea {
  return {
    id: t.id, fase: t.fase, nombre: t.nombre, responsable: t.responsable, duracion: t.duracion, dependencias: t.dependencias,
    inicioFijo: t.inicioFijo, hecho: t.hecho, fechaHecho: t.fechaHecho, notas: t.notas,
  };
}

function Gantt({
  tasks,
  today,
  target,
  projected,
  onToggle,
  readOnly,
  costByTask,
}: {
  tasks: ScheduledTask[];
  today: string;
  target: string;
  projected: string;
  onToggle: (id: string, hecho: boolean) => void;
  readOnly: boolean;
  costByTask: Map<string, number>;
}) {
  if (tasks.length === 0) return <p className="muted">No hay tareas. Añádelas en «Editar tareas».</p>;
  const starts = tasks.map((t) => t.es).concat(today);
  const ends = tasks.map((t) => t.ef).concat(target, projected);
  const min = addDays(starts.reduce((a, b) => (a < b ? a : b)), -5);
  const max = addDays(ends.reduce((a, b) => (a > b ? a : b)), 10);
  const span = Math.max(1, toDay(max) - toDay(min));
  const x = (iso: string) => ((toDay(iso) - toDay(min)) / span) * 100;

  const months: { label: string; left: number }[] = [];
  for (let m = monthKey(min); m <= monthKey(max); m = addMonths(m, 1)) {
    const first = `${m}-01`;
    months.push({ label: monthLabel(m), left: Math.max(0, x(first < min ? min : first)) });
  }

  const groups = new Map<string, ScheduledTask[]>();
  for (const t of tasks) groups.set(t.fase, [...(groups.get(t.fase) ?? []), t]);

  return (
    <>
      <div className="legend">
        <span><i style={{ background: 'color-mix(in srgb, var(--accent) 55%, var(--surface))' }} />Tarea</span>
        <span><i style={{ background: 'var(--crit)' }} />Crítica (marca la fecha de apertura)</span>
        <span><i style={{ background: 'var(--sage)' }} />Hecha</span>
        <span><i style={{ background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }} />Margen hasta la fecha límite</span>
        <span><i style={{ background: 'var(--info)' }} />Hoy</span>
        <span><i style={{ background: 'var(--ok)' }} />Kick-off objetivo</span>
        {projected !== target && <span><i style={{ background: 'var(--bad)' }} />Apertura prevista</span>}
      </div>
      <div className="gantt">
        <div className="gantt-inner">
          <div className="gantt-head">
            <div className="gantt-label">Tarea</div>
            <div className="gantt-months">
              {months.map((m) => (
                <div key={m.label} className="gantt-month" style={{ left: `${m.left}%` }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 300, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
              <div className="gantt-line today" style={{ left: `${x(today)}%` }} title={`Hoy ${formatDate(today)}`} />
              <div className="gantt-line target" style={{ left: `${x(target)}%` }} title={`Kick-off objetivo ${formatDate(target)}`} />
              {projected !== target && <div className="gantt-line projected" style={{ left: `${x(projected)}%` }} title={`Apertura prevista ${formatDate(projected)}`} />}
            </div>
            {[...groups].map(([fase, list]) => (
              <div key={fase}>
                <div className="gantt-row phase">
                  <div className="gantt-label">{fase}</div>
                  <div />
                </div>
                {list.map((t) => {
                  const milestone = t.duracion === 0;
                  const cost = costByTask.get(t.id);
                  const tip = `${t.nombre}\n${formatDate(t.es)} → ${formatDate(t.ef)} (${t.duracion} días)\nEmpezar antes de: ${formatDate(t.ls)} · holgura ${t.slack} d${cost ? `\nCoste: ${eur(cost)}` : ''}`;
                  return (
                    <div className="gantt-row" key={t.id} title={tip}>
                      <div className="gantt-label">
                        <input
                          type="checkbox"
                          checked={t.hecho}
                          disabled={readOnly}
                          aria-label={`Marcar ${t.nombre} como hecha`}
                          style={{ width: 17, height: 17, accentColor: 'var(--sage)', flex: 'none' }}
                          onChange={(e) => onToggle(t.id, e.target.checked)}
                        />
                        <span className="name" style={{ textDecoration: t.hecho ? 'line-through' : undefined, color: t.hecho ? 'var(--muted)' : undefined, fontWeight: t.critical ? 600 : 400 }}>
                          {t.nombre}
                        </span>
                      </div>
                      <div className="gantt-track">
                        {!t.hecho && !milestone && t.slack > 0 && (
                          <div className="gantt-latest" style={{ left: `${x(t.ef)}%`, width: `${Math.max(0, x(fromDay(toDay(t.ef) + t.slack)) - x(t.ef))}%` }} />
                        )}
                        <div
                          className={`gantt-bar ${t.hecho ? 'done' : t.critical ? 'critical' : ''} ${milestone ? 'milestone' : ''}`}
                          style={{ left: `${x(t.es)}%`, width: milestone ? undefined : `${Math.max(0.4, x(t.ef) - x(t.es))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Marca las tareas hechas con el check. Para cambiar duraciones, dependencias o fijar fechas, usa «Editar tareas»: el resto del plan se recalcula solo.
      </p>
    </>
  );
}
