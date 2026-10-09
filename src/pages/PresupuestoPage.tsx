import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../state/DataContext';
import { Card, Field, NumberInput, PageShell, Stat, Tabs, useTab } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { GastoFijo, PartidaInversion } from '../data/types';
import { CATEGORIAS_INVERSION, desembolsoPartida, ivaPartida, totalPartida } from '../domain/budget';
import { IVA_TIPOS } from '../domain/taxes';
import { eur, eurShort, uid } from '../lib/format';

type TabId = 'inversion' | 'mensual' | 'resumen';

const IVA_OPTS = IVA_TIPOS.map((v) => ({ value: String(v), label: `${v} %` }));

export function PresupuestoPage() {
  const { db, derived: d, setTable, updateSettings, readOnly } = useData();
  const [tab, setTab] = useTab<TabId>('presupuesto', 'inversion');
  const b = d.budget;
  const taskOptions = [{ value: '', label: '— sin tarea —' }, ...db.Tareas.map((t) => ({ value: t.id, label: t.nombre }))];
  const categorias = Array.from(new Set([...CATEGORIAS_INVERSION, ...db.Inversion.map((p) => p.categoria)]));

  const nuevaPartida = (categoria = 'Obras e instalaciones'): PartidaInversion => ({
    id: uid('inv'), categoria, concepto: '', cantidad: 1, precioUnit: 0, ivaPct: 21, modo: 'compra', cuotaMensual: 0,
    amortAnios: 0, estado: 'estimado', tareaId: '', proveedor: '', notas: '',
  });

  const invColumns: Column<PartidaInversion>[] = [
    { key: 'concepto', label: 'Concepto', width: 260 },
    { key: 'cantidad', label: 'Cant.', type: 'number', decimals: 2, width: 70 },
    { key: 'precioUnit', label: 'Precio unit. (sin IVA)', type: 'money', width: 120 },
    {
      key: 'ivaPct', label: 'IVA', type: 'select', width: 80,
      options: IVA_OPTS,
    },
    { key: 'total', label: 'Total sin IVA', type: 'computed', align: 'right', render: (p) => eur(totalPartida(p)), width: 105 },
    { key: 'totalIva', label: 'Con IVA', type: 'computed', align: 'right', render: (p) => (p.modo === 'compra' ? eur(desembolsoPartida(p) + ivaPartida(p)) : <span className="muted">—</span>), width: 100 },
    {
      key: 'modo', label: 'Modo', type: 'select', width: 105,
      options: [
        { value: 'compra', label: 'Compra' },
        { value: 'leasing', label: 'Leasing' },
        { value: 'renting', label: 'Renting' },
        { value: 'comodato', label: 'Comodato' },
      ],
    },
    { key: 'cuotaMensual', label: 'Cuota/mes', type: 'money', width: 95, readOnly: (p) => p.modo !== 'leasing' && p.modo !== 'renting', title: 'Solo leasing o renting (sin IVA)' },
    { key: 'amortAnios', label: 'Amort. (años)', type: 'number', decimals: 0, width: 80, title: 'Años de amortización contable (0 = no se amortiza)' },
    {
      key: 'estado', label: 'Estado', type: 'select', width: 120,
      options: [
        { value: 'estimado', label: 'Estimado' },
        { value: 'presupuestado', label: 'Presupuestado' },
        { value: 'pagado', label: 'Pagado' },
      ],
    },
    { key: 'tareaId', label: 'Tarea (cronograma)', type: 'select', options: taskOptions, width: 190 },
    { key: 'categoria', label: 'Categoría', options: categorias, width: 160 },
    { key: 'proveedor', label: 'Proveedor', width: 130 },
    { key: 'notas', label: 'Notas', width: 220 },
  ];

  const saveInversion = (rows: PartidaInversion[]) =>
    setTable('Inversion', rows.map((r) => ({ ...r, ivaPct: Number(r.ivaPct) || 0 })));

  const gastoColumns: Column<GastoFijo>[] = [
    { key: 'concepto', label: 'Concepto', width: 300 },
    { key: 'categoria', label: 'Categoría', options: Array.from(new Set(db.GastosFijos.map((g) => g.categoria))), width: 150 },
    { key: 'importeMensual', label: 'Importe/mes (sin IVA)', type: 'money', width: 140, footer: eur(b.gastosFijosMensual) },
    { key: 'ivaPct', label: 'IVA', type: 'select', options: IVA_OPTS, width: 80 },
    { key: 'conIva', label: 'Con IVA', type: 'computed', align: 'right', render: (g) => eur(g.importeMensual * (1 + g.ivaPct / 100)), width: 110, footer: eur(b.gastosFijosMensualConIva) },
    { key: 'anual', label: 'Anual (sin IVA)', type: 'computed', align: 'right', render: (g) => eur(g.importeMensual * 12), width: 120, footer: eur(b.gastosFijosMensual * 12) },
    { key: 'notas', label: 'Notas', width: 240 },
  ];

  return (
    <PageShell moduleId="presupuesto">
      <div className="stats">
        <Stat label="Inversión (sin IVA)" value={eurShort(b.inversionSinIva)} sub={`+ ${eurShort(b.ivaInversion)} de IVA a adelantar`} />
        <Stat label="Imprevistos" value={eurShort(b.imprevistos)} sub={`${d.settings.imprevistosPct} % de la inversión`} />
        <Stat label="Fondo de maniobra" value={eurShort(b.fondoManiobra)} sub={`${d.settings.fondoManiobraMeses} meses de costes fijos`} />
        <Stat label="Necesidad total" value={eurShort(b.totalNecesidades)} sub="lo que hay que financiar" tone="info" />
        <Stat label="Gastos fijos / mes" value={eur(b.gastosFijosMensual)} sub={`+ personal ${eur(d.personalMensual)}`} />
        <Stat label="Ya pagado" value={eurShort(b.pagado)} sub="partidas en estado «pagado»" tone="ok" />
      </div>

      <Tabs
        tabs={[
          { id: 'inversion', label: 'Inversión inicial' },
          { id: 'mensual', label: 'Gastos fijos mensuales' },
          { id: 'resumen', label: 'Resumen' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'inversion' && (
        <>
          <EditableTable<PartidaInversion>
            rows={db.Inversion}
            columns={invColumns}
            onChange={saveInversion}
            readOnly={readOnly}
            groupBy={(p) => p.categoria || 'Otros'}
            groupFooter={(_g, list) => <b className="num">{eur(list.reduce((s, p) => s + desembolsoPartida(p), 0))}</b>}
            onAddToGroup={(g) => saveInversion([...db.Inversion, nuevaPartida(g)])}
            newRow={() => nuevaPartida('Otros')}
            addLabel="Añadir partida (nueva categoría)"
            confirmDelete={(p) => `¿Eliminar «${p.concepto || 'partida'}»?`}
          />
          <div className="tip" style={{ marginTop: 12 }}>
            <b>Cómo leerlo.</b> Los precios van sin IVA. El IVA de la inversión se adelanta al pagar y se recupera en las primeras declaraciones
            (ya está en Proyecciones). <b>Leasing/renting</b> no requiere desembolso inicial: su cuota pasa a gastos mensuales. <b>Comodato</b>
            (p. ej. la cafetera del tostador) no cuesta nada, pero queda anotado su valor ({eur(b.valorComodato)}).
          </div>
        </>
      )}

      {tab === 'mensual' && (
        <>
          <EditableTable<GastoFijo>
            rows={db.GastosFijos}
            columns={gastoColumns}
            onChange={(rows) => setTable('GastosFijos', rows.map((r) => ({ ...r, ivaPct: Number(r.ivaPct) || 0 })))}
            readOnly={readOnly}
            showFooter
            newRow={() => ({ id: uid('gf'), categoria: 'Servicios', concepto: '', importeMensual: 0, ivaPct: 21, notas: '' })}
            addLabel="Añadir gasto"
          />
          <div className="tip" style={{ marginTop: 12 }}>
            El personal se calcula en <a href="#/rrhh">Equipo</a> ({eur(d.personalMensual)}/mes) y la materia prima en <a href="#/menu">Menú</a> y{' '}
            <a href="#/proyecciones">Proyecciones</a>. Leasing/renting: {eur(b.leasingMensual)}/mes.
          </div>
        </>
      )}

      {tab === 'resumen' && (
        <div className="grid cols-2">
          <Card title="Inversión por categoría">
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={b.porCategoria} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <YAxis type="category" dataKey="categoria" width={150} tick={{ fontSize: 12, fill: 'var(--ink-2)' }} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }} />
                  <Bar dataKey="sinIva" name="Sin IVA" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Total a financiar">
            <table className="data static">
              <tbody>
                {b.porCategoria.map((c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td className="right num">{eur(c.sinIva)}</td>
                  </tr>
                ))}
                <tr>
                  <td><b>Inversión sin IVA</b></td>
                  <td className="right num"><b>{eur(b.inversionSinIva)}</b></td>
                </tr>
                <tr>
                  <td>IVA de la inversión (se recupera después)</td>
                  <td className="right num">{eur(b.ivaInversion)}</td>
                </tr>
                <tr>
                  <td>Imprevistos ({d.settings.imprevistosPct} %)</td>
                  <td className="right num">{eur(b.imprevistos)}</td>
                </tr>
                <tr>
                  <td>Fondo de maniobra ({d.settings.fondoManiobraMeses} meses × {eur(b.costeOperativoMensual)})</td>
                  <td className="right num">{eur(b.fondoManiobra)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Necesidad total</td>
                  <td className="right num">{eur(b.totalNecesidades)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Imprevistos (% de la inversión)">
                <NumberInput value={d.settings.imprevistosPct} decimals={1} onChange={(n) => updateSettings({ imprevistosPct: n })} disabled={readOnly} />
              </Field>
              <Field label="Fondo de maniobra (meses)" hint="Recomendado: 3–6 meses">
                <NumberInput value={d.settings.fondoManiobraMeses} decimals={1} onChange={(n) => updateSettings({ fondoManiobraMeses: n })} disabled={readOnly} />
              </Field>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
