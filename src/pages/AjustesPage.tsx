import { useData } from '../state/DataContext';
import { Card, DateInput, Field, NumberInput, PageShell, TextInput } from '../components/ui';
import { getConfiguredUrl, LocalDemoApi } from '../lib/api';
import { eur } from '../lib/format';

export function AjustesPage() {
  const { derived: d, updateSettings, readOnly, api, session, reload, initialize } = useData();
  const s = d.settings;
  return (
    <PageShell moduleId="ajustes" subtitle="Parámetros generales del proyecto. Se guardan en la pestaña «Config» del Sheet.">
      <div className="stack">
        <Card title="Proyecto">
          <div className="form-grid">
            <Field label="Nombre del negocio">
              <TextInput value={s.nombreNegocio} onChange={(v) => updateSettings({ nombreNegocio: v })} disabled={readOnly} />
            </Field>
            <Field label="Forma jurídica">
              <TextInput value={s.formaJuridica} onChange={(v) => updateSettings({ formaJuridica: v })} disabled={readOnly} />
            </Field>
            <Field label="Kick-off objetivo">
              <DateInput value={s.fechaKickoff} onChange={(v) => v && updateSettings({ fechaKickoff: v })} disabled={readOnly} />
            </Field>
            <Field label="Planificar desde" hint="Vacío = hoy">
              <DateInput value={s.fechaInicioPlan} onChange={(v) => updateSettings({ fechaInicioPlan: v })} disabled={readOnly} />
            </Field>
          </div>
          <Field label="Concepto (aparece en el plan de negocio)">
            <textarea className="textarea" rows={3} value={s.concepto} disabled={readOnly} onChange={(e) => updateSettings({ concepto: e.target.value })} />
          </Field>
        </Card>

        <Card title="Costes y fiscalidad">
          <div className="form-grid">
            <Field label="Seguridad Social a cargo de la empresa (%)" hint="Hostelería ≈ 31–33 %">
              <NumberInput value={s.ssEmpresaPct} decimals={2} onChange={(n) => updateSettings({ ssEmpresaPct: n })} disabled={readOnly} />
            </Field>
            <Field label="Cuota de autónomos con tarifa plana (€/mes)" hint="80 € + MEI ≈ 88,6 € en 2026">
              <NumberInput value={s.cuotaTarifaPlana} decimals={2} onChange={(n) => updateSettings({ cuotaTarifaPlana: n })} disabled={readOnly} />
            </Field>
            <Field label="Meses de tarifa plana">
              <NumberInput value={s.mesesTarifaPlana} decimals={0} onChange={(n) => updateSettings({ mesesTarifaPlana: n })} disabled={readOnly} />
            </Field>
            <Field label="Food cost objetivo general (%)">
              <NumberInput value={s.objetivoFoodCostPct} decimals={1} onChange={(n) => updateSettings({ objetivoFoodCostPct: n })} disabled={readOnly} />
            </Field>
            <Field label="Merma y consumo interno (% sobre food cost)">
              <NumberInput value={s.mermaFoodCostPct} decimals={1} onChange={(n) => updateSettings({ mermaFoodCostPct: n })} disabled={readOnly} />
            </Field>
            <Field label="Imprevistos (% de la inversión)">
              <NumberInput value={s.imprevistosPct} decimals={1} onChange={(n) => updateSettings({ imprevistosPct: n })} disabled={readOnly} />
            </Field>
            <Field label="Fondo de maniobra (meses)" hint={`≈ ${eur(d.budget.costeOperativoMensual)}/mes de costes fijos`}>
              <NumberInput value={s.fondoManiobraMeses} decimals={1} onChange={(n) => updateSettings({ fondoManiobraMeses: n })} disabled={readOnly} />
            </Field>
          </div>
        </Card>

        <Card title="Conexión y datos">
          <p>
            Modo: <b>{api.mode === 'demo' ? 'demo (datos solo en este navegador)' : 'Google Sheets'}</b>
            {session && <> · usuario <b>{session.user.usuario}</b> ({session.user.rol})</>}
          </p>
          {api.mode === 'sheets' && <p className="muted" style={{ wordBreak: 'break-all' }}>Apps Script: {getConfiguredUrl()}</p>}
          <div className="row">
            <button className="btn" onClick={() => void reload()}>Recargar datos</button>
            {!readOnly && (
              <button
                className="btn danger"
                onClick={() => {
                  const donde = api.mode === 'demo' ? 'de la demo en este navegador' : 'del Google Sheet (todas las pestañas menos «Usuarios»)';
                  if (!window.confirm(`Se REEMPLAZARÁN todos los datos ${donde} por la plantilla de ejemplo de Barcelona. ¿Continuar?`)) return;
                  if (api.mode === 'demo') LocalDemoApi.reset();
                  void initialize('ejemplo');
                }}
              >
                Cargar plantilla de ejemplo
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: '0.88rem' }}>
            Usuarios y contraseñas: pestaña «Usuarios» del Google Sheet (columnas usuario, password, nombre, rol, activo). Rol «lector» = solo puede ver.
            Para cambiar la URL del Apps Script, sal y usa «Conexión con Google Sheets» en la pantalla de entrada.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
