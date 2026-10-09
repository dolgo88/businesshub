import { useState, type FormEvent } from 'react';
import { useData } from '../state/DataContext';
import { getConfiguredUrl, setConfiguredUrl } from '../lib/api';

export function LoginPage() {
  const { login, api } = useData();
  const [usuario, setUsuario] = useState(api.mode === 'demo' ? 'demo' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [url, setUrl] = useState(getConfiguredUrl());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(usuario, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const saveUrl = () => {
    const clean = url.trim();
    if (clean && !/^https:\/\/script\.google(usercontent)?\.com\//.test(clean)) {
      setError('La URL debe ser la de la aplicación web de Apps Script (https://script.google.com/macros/s/…/exec).');
      return;
    }
    setConfiguredUrl(clean);
    window.location.reload();
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand-mark">B</div>
        <h1>BusinessHub</h1>
        <p className="lead">Plan de apertura del café · panadería · restaurante</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Usuario</span>
            <input className="input" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="login-foot">
          {api.mode === 'demo' ? (
            <p>
              <b>Modo demo</b>: usuario <code>demo</code>, contraseña <code>demo</code>. Los datos se guardan solo en este navegador.
            </p>
          ) : (
            <p>Los usuarios y contraseñas se gestionan en la pestaña «Usuarios» de vuestro Google Sheet.</p>
          )}
          <button className="linklike" onClick={() => setShowConfig((s) => !s)}>
            {showConfig ? 'Ocultar' : 'Conexión con Google Sheets'}
          </button>
          {showConfig && (
            <div style={{ display: 'grid', gap: 8, marginTop: 10, textAlign: 'left' }}>
              <label className="field">
                <span>URL de la aplicación web de Apps Script</span>
                <input className="input" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
              </label>
              <div className="row">
                <button className="btn small primary" type="button" onClick={saveUrl}>
                  Guardar y recargar
                </button>
                {getConfiguredUrl() && (
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => {
                      setConfiguredUrl('');
                      window.location.reload();
                    }}
                  >
                    Usar modo demo
                  </button>
                )}
              </div>
              <small>Los pasos para obtenerla están en docs/SETUP.md del repositorio.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
