import { useMemo, useState } from 'react';
import { useData } from '../state/DataContext';
import { Alert, Card, Field, NumberInput, PageShell, Select, Stat, Tabs, TextInput, Toggle, useTab } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import { Icon } from '../components/Icons';
import type { Componente, Ingrediente, Plato } from '../data/types';
import { ALERGENOS, type PlatoCalc } from '../domain/recipes';
import { IVA_TIPOS } from '../domain/taxes';
import { eur, num, pct, uid } from '../lib/format';

type TabId = 'carta' | 'subrecetas' | 'ingredientes' | 'lineas';

const IVA_OPTS = IVA_TIPOS.map((v) => ({ value: String(v), label: `${v} %` }));

export function MenuPage() {
  const { db, derived: d } = useData();
  const [tab, setTab] = useTab<TabId>('menu', 'carta');
  const m = d.menu;
  const fcMedio = useMemo(() => {
    const ls = [...m.porLinea.values()];
    return ls.length ? ls.reduce((s, l) => s + l.foodCostPct, 0) / ls.length : 0;
  }, [m]);
  const altos = m.platos.filter((p) => p.plato.activo && p.foodCostPct > p.plato.foodCostObjetivoPct + 5);

  return (
    <PageShell moduleId="menu" subtitle="Escandallos: de los ingredientes al coste de cada plato, su precio sugerido y sus alérgenos. Alimenta las proyecciones.">
      <div className="stats">
        <Stat label="Platos en carta" value={`${m.platos.filter((p) => p.plato.activo).length}`} sub={`${m.subrecetas.length} subrecetas · ${db.Ingredientes.length} ingredientes`} />
        <Stat label="Food cost teórico medio" value={pct(fcMedio)} sub={`objetivo ${d.settings.objetivoFoodCostPct} %`} tone={fcMedio > d.settings.objetivoFoodCostPct + 3 ? 'warn' : 'ok'} />
        <Stat label="Food cost real estimado" value={pct(fcMedio * (1 + d.settings.mermaFoodCostPct / 100))} sub={`+${d.settings.mermaFoodCostPct} % merma y consumo interno`} />
        <Stat label="Platos por encima del objetivo" value={`${altos.length}`} tone={altos.length ? 'warn' : 'ok'} sub={altos.slice(0, 2).map((p) => p.plato.nombre).join(', ') || 'ninguno'} />
      </div>

      <Tabs
        tabs={[
          { id: 'carta', label: 'Carta' },
          { id: 'subrecetas', label: 'Subrecetas (pan, masa madre, salsas…)' },
          { id: 'ingredientes', label: 'Ingredientes' },
          { id: 'lineas', label: 'Food cost por línea' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'carta' && <RecipeEditor tipo="plato" />}
      {tab === 'subrecetas' && <RecipeEditor tipo="subreceta" />}
      {tab === 'ingredientes' && <IngredientTable />}
      {tab === 'lineas' && (
        <Card title="Food cost por línea de negocio">
          <div className="table-wrap">
            <table className="data static">
              <thead>
                <tr>
                  <th>Línea</th>
                  <th className="right">Platos</th>
                  <th className="right">PVP medio (con IVA)</th>
                  <th className="right">Food cost teórico</th>
                  <th className="right">Con merma (+{d.settings.mermaFoodCostPct} %)</th>
                </tr>
              </thead>
              <tbody>
                {[...m.porLinea.values()].map((l) => (
                  <tr key={l.linea}>
                    <td>{l.linea}</td>
                    <td className="right num">{l.platos}</td>
                    <td className="right num">{eur(l.pvpMedio, 2)}</td>
                    <td className="right num">{pct(l.foodCostPct)}</td>
                    <td className="right num">{pct(l.foodCostPct * (1 + d.settings.mermaFoodCostPct / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: '0.88rem' }}>
            En <a href="#/proyecciones">Proyecciones</a>, cada franja de ventas usa el food cost de su línea (ponderado por el «peso» de cada plato en
            las ventas). Si una línea no tiene platos, se usa el objetivo general ({d.settings.objetivoFoodCostPct} %). La merma se ajusta en Ajustes.
          </p>
          <p className="muted" style={{ fontSize: '0.88rem' }}>
            Referencias habituales: café 15–25 %, panadería 15–25 %, bocatas y take-away 25–32 %, cocina de cenas 28–35 %.
          </p>
        </Card>
      )}
    </PageShell>
  );
}

function RecipeEditor({ tipo }: { tipo: 'plato' | 'subreceta' }) {
  const { db, derived: d, setTable, readOnly } = useData();
  const m = d.menu;
  const list = (tipo === 'plato' ? m.platos : m.subrecetas).slice().sort((a, b) => a.plato.categoria.localeCompare(b.plato.categoria) || a.plato.nombre.localeCompare(b.plato.nombre));
  const [selectedId, setSelectedId] = useState<string>(list[0]?.plato.id ?? '');
  const selected = m.byId.get(selectedId) && m.byId.get(selectedId)!.plato.tipo === tipo ? m.byId.get(selectedId)! : list[0];
  const categorias = Array.from(new Set(db.Platos.filter((p) => p.tipo === tipo).map((p) => p.categoria)));
  const lineas = Array.from(new Set([...db.Franjas.map((f) => f.linea), ...db.Platos.map((p) => p.linea)].filter(Boolean)));

  const crear = () => {
    const id = uid(tipo === 'plato' ? 'pl' : 'sub');
    const nuevo: Plato = {
      id, nombre: tipo === 'plato' ? 'Nuevo plato' : 'Nueva subreceta', tipo, categoria: selected?.plato.categoria ?? (tipo === 'plato' ? 'Bocatas' : 'Obrador'),
      linea: tipo === 'plato' ? selected?.plato.linea ?? lineas[0] ?? '' : '', ivaPct: 10, foodCostObjetivoPct: d.settings.objetivoFoodCostPct, pvp: 0,
      rendimiento: 1, unidadRendimiento: tipo === 'plato' ? 'ud' : 'kg', peso: 1, activo: true, notas: '',
    };
    setTable('Platos', [...db.Platos, nuevo]);
    setSelectedId(id);
  };

  let body = <p className="muted">No hay {tipo === 'plato' ? 'platos' : 'subrecetas'}. Crea el primero.</p>;
  if (selected) body = <RecipeDetail calc={selected} categorias={categorias} lineas={lineas} onDeleted={() => setSelectedId('')} onDuplicated={setSelectedId} />;

  let lastCat = '';
  return (
    <div className="menu-layout">
      <Card className="menu-list-card">
        <div className="menu-list">
          {list.map((p) => {
            const header = p.plato.categoria !== lastCat ? <div className="menu-cat">{p.plato.categoria || 'Sin categoría'}</div> : null;
            lastCat = p.plato.categoria;
            return (
              <div key={p.plato.id}>
                {header}
                <button className={`menu-item ${selected?.plato.id === p.plato.id ? 'active' : ''}`} onClick={() => setSelectedId(p.plato.id)}>
                  <span>
                    <span style={{ opacity: p.plato.activo ? 1 : 0.5 }}>{p.plato.nombre}</span>
                    <span className="meta" style={{ display: 'block' }}>
                      {tipo === 'plato' ? `coste ${eur(p.coste, 2)} · FC ${pct(p.foodCostPct, 0)}` : `${eur(p.costeUnitario, 2)}/${p.plato.unidadRendimiento}`}
                    </span>
                  </span>
                  {tipo === 'plato' && <b className="num">{eur(p.pvpEfectivo, 2)}</b>}
                </button>
              </div>
            );
          })}
        </div>
        {!readOnly && (
          <button className="btn small" style={{ marginTop: 8 }} onClick={crear}>
            <Icon name="plus" size={14} /> {tipo === 'plato' ? 'Nuevo plato' : 'Nueva subreceta'}
          </button>
        )}
      </Card>
      <div>{body}</div>
    </div>
  );
}

function RecipeDetail({
  calc,
  categorias,
  lineas,
  onDeleted,
  onDuplicated,
}: {
  calc: PlatoCalc;
  categorias: string[];
  lineas: string[];
  onDeleted: () => void;
  onDuplicated: (id: string) => void;
}) {
  const { db, setTable, readOnly } = useData();
  const p = calc.plato;
  const esPlato = p.tipo === 'plato';
  const set = (patch: Partial<Plato>) => setTable('Platos', db.Platos.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  const comps = db.Componentes.filter((c) => c.platoId === p.id);
  const lineaById = new Map(calc.lineas.map((l) => [l.componente.id, l]));

  const componentOptions = [
    ...db.Ingredientes.map((i) => ({ value: i.id, label: `${i.nombre} (${i.unidad})` })),
    ...db.Platos.filter((x) => x.tipo === 'subreceta' && x.id !== p.id).map((x) => ({ value: x.id, label: `◆ ${x.nombre} (${x.unidadRendimiento})` })),
  ];

  const saveComps = (rows: Componente[]) => setTable('Componentes', [...db.Componentes.filter((c) => c.platoId !== p.id), ...rows]);

  const duplicar = () => {
    const id = uid(esPlato ? 'pl' : 'sub');
    setTable('Platos', [...db.Platos, { ...p, id, nombre: `${p.nombre} (copia)` }]);
    setTable('Componentes', [...db.Componentes, ...comps.map((c) => ({ ...c, id: uid('c'), platoId: id }))]);
    onDuplicated(id);
  };

  const eliminar = () => {
    const usos = db.Componentes.filter((c) => c.componenteId === p.id).length;
    const msg = usos ? `«${p.nombre}» se usa en ${usos} receta(s). ¿Eliminarla igualmente?` : `¿Eliminar «${p.nombre}»?`;
    if (!window.confirm(msg)) return;
    setTable('Platos', db.Platos.filter((x) => x.id !== p.id));
    setTable('Componentes', db.Componentes.filter((c) => c.platoId !== p.id && c.componenteId !== p.id));
    onDeleted();
  };

  const columns: Column<Componente>[] = [
    { key: 'componenteId', label: 'Ingrediente o subreceta', type: 'select', options: [{ value: '', label: '— elegir —' }, ...componentOptions], width: 320 },
    { key: 'cantidad', label: 'Cantidad', type: 'number', decimals: 3, width: 100 },
    { key: 'unidad', label: 'Unidad', type: 'computed', render: (c) => lineaById.get(c.id)?.unidad ?? '', width: 70 },
    { key: 'cu', label: '€/unidad', type: 'computed', align: 'right', render: (c) => eur(lineaById.get(c.id)?.costeUnitario ?? 0, 2), width: 90 },
    { key: 'coste', label: 'Coste', type: 'computed', align: 'right', render: (c) => eur(lineaById.get(c.id)?.coste ?? 0, 2), width: 90, footer: eur(calc.coste, 2) },
  ];

  const fcTone = calc.foodCostPct > p.foodCostObjetivoPct + 5 ? 'bad' : calc.foodCostPct > p.foodCostObjetivoPct ? 'warn' : 'ok';

  return (
    <div className="stack">
      <Card
        title={p.nombre || 'Sin nombre'}
        actions={
          !readOnly && (
            <div className="row">
              <button className="btn small" onClick={duplicar}>Duplicar</button>
              <button className="btn small danger" onClick={eliminar}>Eliminar</button>
            </div>
          )
        }
      >
        {calc.ciclo && <Alert tone="bad" title="Esta receta se contiene a sí misma (directa o indirectamente). Revisa las subrecetas." />}
        <div className="stats">
          {esPlato ? (
            <>
              <Stat label="Coste por ración" value={eur(calc.coste, 2)} />
              <Stat label="PVP sugerido" value={eur(calc.pvpSugerido, 2)} sub={`para FC ${p.foodCostObjetivoPct} % con IVA ${p.ivaPct} %`} tone="info" />
              <Stat label="Food cost" value={pct(calc.foodCostPct)} sub={`PVP ${eur(calc.pvpEfectivo, 2)}${p.pvp > 0 ? '' : ' (sugerido)'}`} tone={fcTone} />
              <Stat label="Margen por venta" value={eur(calc.margen, 2)} sub={`${pct(calc.margenPct, 0)} del precio sin IVA`} />
            </>
          ) : (
            <>
              <Stat label="Coste total de la receta" value={eur(calc.coste, 2)} />
              <Stat label={`Coste por ${p.unidadRendimiento}`} value={eur(calc.costeUnitario, 3)} sub={`rinde ${num(p.rendimiento, 2)} ${p.unidadRendimiento}`} tone="info" />
            </>
          )}
        </div>
        <div className="form-grid">
          <Field label="Nombre">
            <TextInput value={p.nombre} onChange={(v) => set({ nombre: v })} disabled={readOnly} />
          </Field>
          <Field label="Categoría">
            <input className="input" list="cats" value={p.categoria} disabled={readOnly} onChange={(e) => set({ categoria: e.target.value })} />
            <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          {esPlato ? (
            <>
              <Field label="Línea de negocio" hint="Enlaza con las franjas de Proyecciones">
                <input className="input" list="lineas" value={p.linea} disabled={readOnly} onChange={(e) => set({ linea: e.target.value })} />
                <datalist id="lineas">{lineas.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="IVA de venta">
                <Select value={String(p.ivaPct)} options={IVA_OPTS} onChange={(v) => set({ ivaPct: Number(v) })} disabled={readOnly} />
              </Field>
              <Field label="Food cost objetivo (%)">
                <NumberInput value={p.foodCostObjetivoPct} decimals={1} onChange={(n) => set({ foodCostObjetivoPct: n })} disabled={readOnly} />
              </Field>
              <Field label="PVP en carta (con IVA)" hint={p.pvp > 0 ? undefined : 'Vacío = se usa el sugerido'}>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <NumberInput value={p.pvp} decimals={2} onChange={(n) => set({ pvp: n })} disabled={readOnly} />
                  {!readOnly && calc.pvpSugerido > 0 && p.pvp !== calc.pvpSugerido && (
                    <button className="btn small" title="Usar el PVP sugerido" onClick={() => set({ pvp: calc.pvpSugerido })}>
                      {eur(calc.pvpSugerido, 2)}
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Peso en las ventas de su línea" hint="Más alto = se vende más">
                <NumberInput value={p.peso} decimals={1} onChange={(n) => set({ peso: n })} disabled={readOnly} />
              </Field>
              <Field label="En carta">
                <Toggle checked={p.activo} onChange={(b) => set({ activo: b })} label={p.activo ? 'Activo' : 'Fuera de carta'} disabled={readOnly} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Rendimiento" hint="Cuánto sale de la receta">
                <NumberInput value={p.rendimiento} decimals={3} onChange={(n) => set({ rendimiento: n })} disabled={readOnly} />
              </Field>
              <Field label="Unidad">
                <Select value={p.unidadRendimiento} options={['kg', 'l', 'ud']} onChange={(v) => set({ unidadRendimiento: v as Plato['unidadRendimiento'] })} disabled={readOnly} />
              </Field>
            </>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Alérgenos (automático según ingredientes): </span>
          {calc.alergenos.length ? (
            <span className="chips" style={{ display: 'inline-flex' }}>
              {calc.alergenos.map((a) => (
                <span key={a} className="pill warn">{a}</span>
              ))}
            </span>
          ) : (
            <span className="pill ok">sin alérgenos declarados</span>
          )}
        </div>
      </Card>
      <Card title="Ingredientes de la receta">
        <EditableTable<Componente>
          rows={comps}
          columns={columns}
          onChange={saveComps}
          readOnly={readOnly}
          showFooter
          newRow={() => ({ id: uid('c'), platoId: p.id, componenteId: '', cantidad: 0 })}
          addLabel="Añadir ingrediente"
          emptyText="Añade ingredientes o subrecetas con su cantidad (en kg, l o unidades)."
        />
      </Card>
    </div>
  );
}

function IngredientTable() {
  const { db, derived: d, setTable, readOnly } = useData();
  const usos = new Map<string, number>();
  for (const c of db.Componentes) usos.set(c.componenteId, (usos.get(c.componenteId) ?? 0) + 1);
  const columns: Column<Ingrediente>[] = [
    { key: 'nombre', label: 'Ingrediente', width: 220 },
    { key: 'categoria', label: 'Categoría', options: Array.from(new Set(db.Ingredientes.map((i) => i.categoria))), width: 130 },
    { key: 'formato', label: 'Formato de compra', width: 140 },
    { key: 'precioFormato', label: 'Precio (sin IVA)', type: 'money', width: 110 },
    { key: 'cantidadFormato', label: 'Cantidad', type: 'number', decimals: 3, width: 85 },
    { key: 'unidad', label: 'Unidad', type: 'select', options: ['kg', 'l', 'ud'], width: 75 },
    { key: 'mermaPct', label: 'Merma %', type: 'percent', decimals: 1, width: 80 },
    { key: 'coste', label: '€/unidad neta', type: 'computed', align: 'right', render: (i) => eur(d.menu.costeIngrediente.get(i.id) ?? 0, 3), width: 100 },
    { key: 'alergenos', label: 'Alérgenos', type: 'multi', options: [...ALERGENOS], width: 200 },
    { key: 'ivaPct', label: 'IVA', type: 'select', options: IVA_OPTS, width: 75 },
    { key: 'proveedor', label: 'Proveedor', width: 130 },
    { key: 'usos', label: 'Usado en', type: 'computed', align: 'right', render: (i) => `${usos.get(i.id) ?? 0}`, width: 75 },
    { key: 'notas', label: 'Notas', width: 180 },
  ];
  return (
    <>
      <EditableTable<Ingrediente>
        rows={db.Ingredientes}
        columns={columns}
        onChange={(rows) => {
          setTable('Ingredientes', rows.map((r) => ({ ...r, ivaPct: Number(r.ivaPct) || 0 })));
          // Si se ha borrado un ingrediente, se quita también de las recetas.
          const ids = new Set([...rows.map((r) => r.id), ...db.Platos.map((p) => p.id)]);
          if (db.Componentes.some((c) => c.componenteId && !ids.has(c.componenteId))) {
            setTable('Componentes', db.Componentes.filter((c) => !c.componenteId || ids.has(c.componenteId)));
          }
        }}
        readOnly={readOnly}
        groupBy={(i) => i.categoria || 'Otros'}
        newRow={() => ({ id: uid('ing'), nombre: 'Nuevo ingrediente', categoria: 'Otros', proveedor: '', formato: '', precioFormato: 0, cantidadFormato: 1, unidad: 'kg', mermaPct: 0, alergenos: [], ivaPct: 10, notas: '' })}
        addLabel="Añadir ingrediente"
        confirmDelete={(i) => (usos.get(i.id) ? `«${i.nombre}» se usa en ${usos.get(i.id)} receta(s). ¿Eliminarlo?` : `¿Eliminar «${i.nombre}»?`)}
      />
      <div className="tip" style={{ marginTop: 12 }}>
        Cambia aquí el precio de un ingrediente y se recalculan todas las recetas, el PVP sugerido y el food cost de las proyecciones. La merma es lo que se
        pierde al limpiar o cortar (p. ej. 30 % en tomate, 35 % en pescado entero).
      </div>
    </>
  );
}
