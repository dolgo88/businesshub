# BusinessHub

Hub de planificación para abrir en Barcelona un café, panadería de masa madre y restaurante. Ofrece café de especialidad, bocatas (con opción saludable), take-away para oficinas y cenas.

Al entrar aparece un **círculo con 10 secciones conectadas entre sí**. En el centro, una cuenta atrás hasta el kick-off (objetivo: **1 de abril de 2027**) y los indicadores clave.

| Sección | Qué hace |
|---|---|
| **Cronograma** | ~45 tareas de apertura con dependencias. Calcula hacia delante desde hoy y hacia atrás desde el kick-off: holgura, camino crítico, «empezar antes de…» y aviso si no se llega. Diagrama de Gantt, checks de hecho, coste por etapa y caja necesaria por mes. |
| **Presupuesto** | Inversión inicial por categorías (compra, leasing, renting o comodato; IVA; amortización; tarea vinculada) y gastos fijos mensuales. Suma imprevistos y fondo de maniobra. |
| **Financiación** | Socios (añadir o quitar, aportaciones, %), préstamos (sistema francés, carencia, comisión, TAE y tabla de amortización) y otras fuentes. Cuadre con el presupuesto y sugerencia de reparto banco/socios. |
| **Equipo (RRHH)** | Personas, salarios con el mínimo del convenio de hostelería de Cataluña 2026, coste de empresa, socios autónomos (tarifa plana) y cobertura de los turnos. |
| **Menú** | Ingredientes con merma y alérgenos, subrecetas (masa madre, pan, hummus…), escandallos, food cost, PVP sugerido y alérgenos automáticos. |
| **Proyecciones** | Tickets por franja, ramp-up, estacionalidad y 3 escenarios. Cuenta de resultados, tesorería (IVA trimestral, modelo 130, renta), punto de equilibrio, recuperación de la inversión y neto por socio (comunidad de bienes). |
| **Locales** | Comparador de locales candidatos con puntuación ponderada. El elegido actualiza el presupuesto y el cronograma. |
| **Trámites** | Checklist legal para Barcelona (Pla d'usos, licencia, sanidad, alérgenos, catalán, PRL…) vinculada al cronograma. |
| **Documentos** | Índice de enlaces a Drive (contratos, planos, facturas…). |
| **Plan de negocio** | Documento imprimible (o en PDF) para el banco, generado con los datos actuales. |

## Cómo funciona

- **Web:** React + TypeScript + Vite, publicada en GitHub Pages.
- **Datos y usuarios:** un Google Sheet vuestro. Cada pestaña es una tabla y la pestaña «Usuarios» controla el acceso. Un Apps Script ([`apps-script/Code.gs`](apps-script/Code.gs)) hace de API:
  - login con token firmado;
  - lectura y escritura;
  - detección de ediciones simultáneas.
- **Modo demo:** sin Sheet conectado, la web funciona con `demo` / `demo` y guarda los datos en el navegador.
- **Motor de cálculo:** funciones puras en [`src/domain`](src/domain) (planificación, préstamos, nóminas, escandallos, impuestos, proyecciones), con tests.

👉 **Instalación paso a paso:** [docs/SETUP.md](docs/SETUP.md)

## Desarrollo

```bash
npm install
npm run dev        # modo demo en http://localhost:5173
npm test           # tests unitarios + Apps Script contra un Sheet simulado
npm run test:e2e   # Playwright: flujos completos en modo demo y en modo Google Sheets
npm run build
```

Estructura:

```
apps-script/      Code.gs (API sobre Google Sheets) + simulador para tests
src/domain/       cálculos (schedule, loans, payroll, recipes, taxes, budget, projections, locales)
src/data/         tipos y esquema de cada tabla (cómo se guarda en el Sheet)
src/seed/         plantilla de ejemplo para Barcelona
src/state/        carga, autoguardado y datos derivados
src/pages/        una página por sección
e2e/              pruebas de punta a punta
```

## Aviso

Las cifras de la plantilla son **estimaciones orientativas**:

- precios de Barcelona;
- tablas del convenio de hostelería de Cataluña 2026, grupo D;
- cuotas de autónomos 2026;
- escalas de IRPF estatal y catalana.

Todas son editables. Los cálculos fiscales y laborales están simplificados para planificar: **validadlos con vuestra gestoría**.
