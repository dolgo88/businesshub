// La web en modo Google Sheets, hablando con el Apps Script real (apps-script/Code.gs)
// ejecutado en un simulador de Sheets. Comprueba login, inicialización, guardado y recarga.
import { expect, test } from '@playwright/test';
import { loadScript } from '../apps-script/simulator';

const API = 'https://script.google.com/macros/s/TEST/exec';

test('modo Google Sheets: login con la pestaña Usuarios, plantilla, guardado y recarga', async ({ page }) => {
  const gas = loadScript();
  gas.setup();
  const calls: string[] = [];
  await page.route('https://script.google.com/**', async (route) => {
    const body = route.request().postData() ?? '{}';
    calls.push(JSON.parse(body).action);
    const out = gas.doPost({ postData: { contents: body } });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out.s });
  });

  await page.goto('/');
  await page.evaluate((url) => {
    localStorage.clear();
    localStorage.setItem('businesshub.apiUrl', url);
  }, API);
  await page.goto('/');
  await expect(page.locator('.demo-badge')).toHaveCount(0);

  await page.getByLabel('Usuario').fill('socio1');
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('.login-error')).toContainText('incorrectos');

  await page.getByLabel('Contraseña').fill('cambia-esta-clave');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Vuestro Google Sheet está vacío')).toBeVisible();
  await page.getByRole('button', { name: 'Cargar plantilla de ejemplo' }).click();
  await expect(page.locator('.hub-center')).toBeVisible();
  expect(gas.ss.getSheetByName('Tareas')).not.toBeNull();
  expect(gas.ss.getSheetByName('Usuarios')).not.toBeNull();

  // Un cambio se guarda en el Sheet...
  await page.goto('/#/cronograma');
  await page.getByLabel(/Marcar Estudio de zonas/).check();
  await expect(page.locator('.save-indicator')).toContainText('Guardado', { timeout: 5000 });
  const tareas = gas.ss.getSheetByName('Tareas')!.values;
  const headers = tareas[0] as string[];
  const fila = tareas.find((r) => r[headers.indexOf('id')] === 'estudio-zona')!;
  expect(fila[headers.indexOf('hecho')]).toBe(true);

  // ...y lo que se edita directamente en el Sheet aparece al recargar.
  const nombreCol = headers.indexOf('nombre');
  fila[nombreCol] = 'Estudio de zonas (editado en Sheets)';
  await page.reload();
  await expect(page.getByText('Estudio de zonas (editado en Sheets)')).toBeVisible();

  // Desactivar al usuario en el Sheet cierra su sesión.
  const usuarios = gas.ss.getSheetByName('Usuarios')!.values;
  usuarios[1][4] = false;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  expect(calls).toContain('saveTable');
});
