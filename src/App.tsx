import type { ReactElement } from 'react';
import { useData } from './state/DataContext';
import { useRoute } from './lib/router';
import { AppHeader, Toasts } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { HubPage } from './pages/HubPage';
import { CronogramaPage } from './pages/CronogramaPage';
import { PresupuestoPage } from './pages/PresupuestoPage';
import { FinanciacionPage } from './pages/FinanciacionPage';
import { RRHHPage } from './pages/RRHHPage';
import { MenuPage } from './pages/MenuPage';
import { ProyeccionesPage } from './pages/ProyeccionesPage';
import { LocalesPage } from './pages/LocalesPage';
import { TramitesPage } from './pages/TramitesPage';
import { DocumentosPage } from './pages/DocumentosPage';
import { PlanNegocioPage } from './pages/PlanNegocioPage';
import { AjustesPage } from './pages/AjustesPage';

const ROUTES: Record<string, () => ReactElement> = {
  '/': HubPage,
  '/cronograma': CronogramaPage,
  '/presupuesto': PresupuestoPage,
  '/financiacion': FinanciacionPage,
  '/rrhh': RRHHPage,
  '/menu': MenuPage,
  '/proyecciones': ProyeccionesPage,
  '/locales': LocalesPage,
  '/tramites': TramitesPage,
  '/documentos': DocumentosPage,
  '/plan': PlanNegocioPage,
  '/ajustes': AjustesPage,
};

export function App() {
  const { loadState, loadError, reload, initialize, logout, readOnly } = useData();
  const route = useRoute();

  if (loadState === 'anonymous') {
    return (
      <>
        <LoginPage />
        <Toasts />
      </>
    );
  }

  let content: ReactElement;
  if (loadState === 'loading') {
    content = (
      <div className="center-screen">
        <div>
          <div className="spinner" />
          <p className="muted">Cargando datos…</p>
        </div>
      </div>
    );
  } else if (loadState === 'error') {
    content = (
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 520 }}>
          <h2>No se han podido cargar los datos</h2>
          <p className="muted">{loadError}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => void reload()}>Reintentar</button>
            <button className="btn" onClick={logout}>Salir</button>
          </div>
        </div>
      </div>
    );
  } else if (loadState === 'empty') {
    content = (
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 620, textAlign: 'left' }}>
          <h2>Vuestro Google Sheet está vacío</h2>
          <p>
            Podéis empezar con una <b>plantilla de ejemplo para Barcelona</b> (≈45 tareas de apertura, presupuesto orientativo, convenio de hostelería
            2026, carta con escandallos, trámites…) y adaptarla, o empezar de cero.
          </p>
          <p className="muted">Se crearán las pestañas en el Sheet. La pestaña «Usuarios» no se toca.</p>
          {readOnly ? (
            <p className="muted">Tu usuario es de solo lectura: pide a un editor que lo inicialice.</p>
          ) : (
            <div className="row">
              <button className="btn primary" onClick={() => void initialize('ejemplo')}>Cargar plantilla de ejemplo</button>
              <button className="btn" onClick={() => void initialize('vacio')}>Empezar vacío</button>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    const Page = ROUTES[route] ?? HubPage;
    content = <Page />;
  }

  return (
    <>
      <AppHeader />
      <main>{content}</main>
      <Toasts />
    </>
  );
}
