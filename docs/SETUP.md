# Puesta en marcha

Hay tres piezas:

1. **La web**: se publica gratis en GitHub Pages.
2. **Un Google Sheet en vuestro Drive**: guarda todos los datos y los usuarios.
3. **Un Apps Script dentro de ese Sheet**: conecta la web con el Sheet. Es el archivo [`apps-script/Code.gs`](../apps-script/Code.gs).

Mientras no conectéis el Sheet, la web funciona en **modo demo**: entráis con `demo` / `demo` y los datos se guardan solo en ese navegador.

---

## 1. Crear el Google Sheet

1. En Google Drive: **Nuevo → Hojas de cálculo de Google**. Ponedle un nombre, por ejemplo «BusinessHub – Datos».
2. **Compartidlo solo entre los socios.** Ojo: las contraseñas se guardan en texto plano en la pestaña «Usuarios», así que quien tenga acceso al Sheet las puede ver.

## 2. Instalar el Apps Script

1. Abrid el Sheet y entrad en **Extensiones → Apps Script**.
2. Borrad lo que haya en `Código.gs`, pegad el contenido de `apps-script/Code.gs` y guardad (💾).
   - **Copiadlo desde la versión raw:** https://raw.githubusercontent.com/dolgo88/businesshub/main/apps-script/Code.gs (Ctrl+A, Ctrl+C). También sirve el botón «Copy raw file» de la página del archivo en GitHub.
   - No lo seleccionéis en la vista normal de GitHub: en archivos largos solo se copian las líneas visibles y Apps Script da `SyntaxError: Unexpected end of input`.
   - El archivo pegado tiene unas 310 líneas y termina con la función `selfTest` (`return result;` y `}`).
3. Opcional: en **Configuración del proyecto** (⚙️) poned la zona horaria «Europe/Madrid».
4. Elegid la función **`setup`** en el desplegable de arriba y pulsad **Ejecutar**.
   - Google pedirá permisos. Como el script es vuestro, saldrá el aviso «Google no ha verificado esta aplicación».
   - Pulsad **Configuración avanzada → Ir a … (no seguro) → Permitir**.
   - `setup` crea la pestaña **Usuarios** con dos usuarios de ejemplo (`socio1` y `socio2`, ambos con la contraseña `cambia-esta-clave`).
5. Opcional: ejecutad **`selfTest`**. El registro debe mostrar todo en `true`.

## 3. Gestionar usuarios (pestaña «Usuarios»)

| usuario | password | nombre | rol | activo |
|---|---|---|---|---|
| socio1 | *vuestra-clave* | Nombre Apellido | editor | TRUE |

- **Cambiad las contraseñas** de ejemplo antes de nada.
- `rol`:
  - `editor` puede modificar los datos.
  - `lector` solo puede ver (útil para la gestoría o un inversor).
- `activo`: poned `FALSE` para quitarle el acceso a alguien. Se le cierra la sesión en la siguiente petición.
- Las sesiones duran 7 días. Para echar a todo el mundo, ejecutad `cerrarTodasLasSesiones` en el editor de Apps Script.
- Si alguien falla 8 veces la contraseña, ese usuario queda bloqueado 15 minutos.

## 4. Publicar el Apps Script como aplicación web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Tipo (⚙️): **Aplicación web**.
3. Configuración:
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier usuario.

   La web necesita esto para poder llamar al script. Aun así, no da acceso a nada sin usuario y contraseña, y la pestaña «Usuarios» nunca sale del Sheet.
4. Pulsad **Implementar** y copiad la **URL de la aplicación web** (termina en `/exec`).

> Si más adelante actualizáis `Code.gs`: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así se mantiene la misma URL.

## 5. Conectar la web con el Sheet

Hay dos opciones; basta con una:

- **Rápida (en cada navegador):** en la pantalla de entrada, pulsad «Conexión con Google Sheets», pegad la URL y guardad.
- **Para todos:** en GitHub, entrad en **Settings → Secrets and variables → Actions → Variables** y cread la variable `APPS_SCRIPT_URL` con la URL. La siguiente publicación ya la llevará incorporada.

La primera vez que entréis, la web verá el Sheet vacío y os ofrecerá dos opciones:

- **Cargar plantilla de ejemplo:** tareas de apertura, presupuesto orientativo de Barcelona, convenio de hostelería 2026, carta con escandallos, trámites…
- **Empezar vacío.**

Se crea una pestaña por tabla (Tareas, Inversion, GastosFijos, Socios, Prestamos, Personal, Ingredientes, Platos…).

## 6. Publicar la web en GitHub Pages

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Cada vez que se fusiona algo en `main`, el workflow «Publicar en GitHub Pages» pasa los tests y publica la web en `https://dolgo88.github.io/businesshub/`.

---

## Trabajar con los datos desde Google Sheets

- Cada pestaña es una tabla. La **fila 1 son las cabeceras: no las cambiéis**.
- Podéis editar valores directamente en el Sheet. La web los verá al recargar.
- **Listas:** van separadas por comas, por ejemplo las dependencias de una tarea (`busqueda-local,verificar-local`) o los alérgenos (`gluten,lácteos`).
- **Fechas:** en formato `AAAA-MM-DD`.
- **Pestañas propias:** si el nombre empieza por `_` (por ejemplo `_notas`), la web las ignora.
- **Ediciones simultáneas:** si alguien guarda en la web mientras otro edita lo mismo (o se cambia el Sheet a mano), la web lo detecta, avisa y recarga los datos más recientes en lugar de pisarlos.
- **Copias de seguridad:** Google Sheets guarda el historial de versiones (**Archivo → Historial de versiones**).

## Seguridad: qué saber

- El repositorio es **público**: contiene el código y la plantilla de ejemplo, **nunca vuestros datos**. Los datos solo viven en vuestro Sheet.
- La URL del Apps Script no es secreta, pero sin usuario y contraseña no devuelve nada.
- Las contraseñas están en texto plano en el Sheet porque así se gestionan cómodamente desde allí. Por eso el Sheet debe estar compartido solo con los socios.

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173 (modo demo)
npm test             # tests del motor de cálculo y del Apps Script (simulado)
npm run test:e2e     # pruebas de punta a punta con Playwright
npm run build        # compila a dist/
```

Para probar contra vuestro Sheet en local: `VITE_API_URL=https://script.google.com/macros/s/…/exec npm run dev`.
