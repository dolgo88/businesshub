import { expect, test, type Locator, type Page } from '@playwright/test';

async function loginDemo(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/');
  await page.getByLabel('Contraseña').fill('demo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Cargar plantilla de ejemplo' }).click();
  await expect(page.locator('.hub-center')).toBeVisible();
}

/** Fila de una tabla editable cuyo input `label` tiene el valor indicado. */
async function rowWhere(page: Page, label: string, value: string): Promise<Locator> {
  const inputs = page.locator(`input[aria-label="${label}"]`);
  const values = await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const i = values.indexOf(value);
  expect(i, `fila con ${label} = "${value}"`).toBeGreaterThanOrEqual(0);
  return page.locator('tbody tr').filter({ has: page.locator(`input[aria-label="${label}"]`) }).nth(i);
}

function stat(page: Page, label: string): Locator {
  return page.locator('.stat').filter({ has: page.locator('.label', { hasText: label }) }).locator('.value');
}

test('login demo, plantilla de ejemplo y círculo con las 10 secciones', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Contraseña').fill('mala');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('.login-error')).toContainText('demo');

  await loginDemo(page);
  const nodes = page.locator('.hub-node');
  await expect(nodes).toHaveCount(10);
  for (const name of ['Cronograma', 'Presupuesto', 'Financiación', 'Equipo', 'Menú', 'Proyecciones', 'Locales', 'Trámites', 'Documentos', 'Plan de negocio']) {
    await expect(nodes.filter({ hasText: name })).toHaveCount(1);
  }
  await expect(page.locator('.hub-center')).toContainText('días para el kick-off');

  await nodes.filter({ hasText: 'Proyecciones' }).click();
  await expect(page.getByRole('heading', { name: 'Proyecciones' })).toBeVisible();
  await page.getByRole('button', { name: 'Inicio' }).click();
  await expect(page.locator('.hub-center')).toBeVisible();
});

test('una partida nueva del presupuesto llega al cronograma y a la financiación', async ({ page }) => {
  await loginDemo(page);

  await page.goto('/#/financiacion');
  await expect(stat(page, 'Necesidad total')).toHaveText('327 k€');

  await page.goto('/#/cronograma');
  await page.getByRole('tab', { name: 'Costes y caja por etapa' }).click();
  const obras = page.locator('tr', { hasText: '5. Obras e instalaciones' }).locator('td').last();
  await expect(obras).toHaveText(/93\.170/);

  await page.goto('/#/presupuesto');
  await page.locator('tr.group', { hasText: 'Obras e instalaciones' }).getByRole('button', { name: 'Añadir' }).click();
  const row = await rowWhere(page, 'Concepto', '');
  await row.getByLabel('Concepto').fill('Reforma extra de la fachada');
  await row.getByLabel('Precio unit. (sin IVA)').fill('10000');
  await row.getByLabel('Tarea (cronograma)').selectOption('obras');

  await page.goto('/#/cronograma');
  await page.getByRole('tab', { name: 'Costes y caja por etapa' }).click();
  await expect(obras).toHaveText(/105\.270/); // + 10.000 € + 21 % IVA

  await page.goto('/#/financiacion');
  await expect(stat(page, 'Necesidad total')).toHaveText('340 k€'); // + 12.100 € + 10 % de imprevistos
});

test('cambiar el precio de un ingrediente recalcula escandallos y proyecciones', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/#/proyecciones');
  const ebitdaAntes = await stat(page, 'EBITDA año 1').innerText();

  await page.goto('/#/menu');
  await page.getByRole('tab', { name: 'Carta' }).click();
  await page.locator('.menu-item', { hasText: 'Espresso' }).click();
  await expect(stat(page, 'Coste por ración')).toHaveText('0,20 €');

  await page.getByRole('tab', { name: 'Ingredientes' }).click();
  const cafe = await rowWhere(page, 'Ingrediente', 'Café de especialidad en grano');
  await cafe.getByLabel('Precio (sin IVA)').fill('66');

  await page.getByRole('tab', { name: 'Carta' }).click();
  await page.locator('.menu-item', { hasText: 'Espresso' }).click();
  await expect(stat(page, 'Coste por ración')).toHaveText('0,59 €');

  await page.goto('/#/proyecciones');
  await expect(stat(page, 'EBITDA año 1')).not.toHaveText(ebitdaAntes);
});

test('cronograma: marcar tareas, guardar y mover el kick-off', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/#/cronograma');
  await expect(stat(page, 'Progreso')).toHaveText('0/45');
  await expect(page.locator('.alert.bad')).toContainText('Kick-off en riesgo');

  await page.getByLabel(/Marcar Estudio de zonas/).check();
  await expect(stat(page, 'Progreso')).toHaveText('1/45');
  await expect(page.locator('.save-indicator')).toContainText('Guardado', { timeout: 5000 });

  await page.reload();
  await expect(stat(page, 'Progreso')).toHaveText('1/45');
  await expect(page.getByLabel(/Marcar Estudio de zonas/)).toBeChecked();

  await page.getByRole('button', { name: /Mover kick-off al/ }).click();
  await expect(page.locator('.alert.ok')).toContainText('El plan llega al kick-off');
});

test('financiación: aplicar la sugerencia cuadra las fuentes', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/#/financiacion');
  await expect(stat(page, 'Falta financiar')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Aplicar sugerencia' }).click();
  await expect(page.locator('.alert.ok')).toContainText('La financiación cubre las necesidades');
});

test('plan de negocio y locales', async ({ page }) => {
  await loginDemo(page);
  await page.goto('/#/plan');
  await expect(page.locator('.report')).toContainText('Cuenta de resultados prevista');
  await expect(page.locator('.report')).toContainText('cuadro de amortización');

  await page.goto('/#/locales');
  page.once('dialog', (d) => d.accept());
  const local = await rowWhere(page, 'Local', 'Ejemplo · Esquina en Eixample con licencia');
  await local.getByRole('button', { name: 'Elegir' }).click();
  await expect(local.locator('.pill.ok')).toHaveText('Elegido');
  await page.goto('/#/presupuesto');
  await page.getByRole('tab', { name: 'Gastos fijos mensuales' }).click();
  await expect((await rowWhere(page, 'Concepto', 'Alquiler (Ejemplo · Esquina en Eixample con licencia)')).getByLabel('Importe/mes (sin IVA)')).toHaveValue('3800');
});

test('móvil: el círculo pasa a cuadrícula @mobile', async ({ page }) => {
  await loginDemo(page);
  await expect(page.locator('.hub-tile')).toHaveCount(10);
  await page.locator('.hub-tile', { hasText: 'Presupuesto' }).click();
  await expect(page.getByRole('heading', { name: 'Presupuesto' })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  for (const r of ['', 'cronograma', 'presupuesto', 'financiacion', 'rrhh', 'menu', 'proyecciones', 'locales', 'tramites', 'documentos', 'plan', 'ajustes']) {
    await page.goto(`/#/${r}`);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `desbordamiento horizontal en /${r}`).toBeLessThanOrEqual(1);
  }
});
