/**
 * BusinessHub · API sobre Google Sheets
 * ------------------------------------------------------------------------------------------
 * Este script vive dentro de vuestro Google Sheet (Extensiones → Apps Script) y hace de
 * "base de datos" para la web. Cada tabla de la web es una pestaña del Sheet.
 *
 *  - La pestaña "Usuarios" guarda quién puede entrar (usuario, password, nombre, rol, activo).
 *    Esa pestaña NUNCA se envía a la web.
 *  - Cualquier pestaña cuyo nombre empiece por "_" se ignora (podéis usarlas para notas).
 *
 * Instalación (ver docs/SETUP.md):
 *  1. Pegad este archivo en el editor de Apps Script del Sheet y guardad.
 *  2. Ejecutad la función setup() una vez (os pedirá permisos).
 *  3. Implementar → Nueva implementación → Aplicación web:
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *  4. Copiad la URL que termina en /exec y pegadla en la pantalla de login de la web.
 */

var USERS_SHEET = 'Usuarios';
var USERS_HEADERS = ['usuario', 'password', 'nombre', 'rol', 'activo'];
var TOKEN_DAYS = 7;
var MAX_FAILED_LOGINS = 8;

// ------------------------------------------------------------------------------------------
// Entrada HTTP
// ------------------------------------------------------------------------------------------

function doGet() {
  return json_({ ok: true, app: 'BusinessHub API', message: 'La API funciona. Usa la web para entrar.' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var result;
    switch (req.action) {
      case 'ping':
        result = { pong: true };
        break;
      case 'login':
        result = login_(String(req.usuario || ''), String(req.password || ''));
        break;
      case 'getAll':
        auth_(req.token, false);
        result = { tables: getAll_() };
        break;
      case 'saveTable':
        auth_(req.token, true);
        result = saveTable_(req.table, req.columns, req.rows, req.baseVersion);
        break;
      default:
        throw apiError_('bad_request', 'Acción desconocida');
    }
    result.ok = true;
    return json_(result);
  } catch (err) {
    return json_({ ok: false, code: err.code || 'error', message: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function apiError_(code, message) {
  var e = new Error(message);
  e.code = code;
  return e;
}

// ------------------------------------------------------------------------------------------
// Usuarios y sesiones
// ------------------------------------------------------------------------------------------

function usersSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(USERS_SHEET);
  if (!sh) throw apiError_('error', 'Falta la pestaña "Usuarios". Ejecuta setup() en el editor de Apps Script.');
  return sh;
}

function findUser_(usuario) {
  var values = usersSheet_().getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idx = {};
  USERS_HEADERS.forEach(function (h) { idx[h] = headers.indexOf(h); });
  if (idx.usuario < 0 || idx.password < 0) {
    throw apiError_('error', 'La pestaña "Usuarios" necesita las columnas "usuario" y "password" en la fila 1.');
  }
  var wanted = usuario.trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[idx.usuario]).trim().toLowerCase() === wanted && wanted) {
      var activo = idx.activo < 0 ? true : row[idx.activo];
      return {
        usuario: String(row[idx.usuario]).trim(),
        password: String(row[idx.password]),
        nombre: idx.nombre < 0 ? '' : String(row[idx.nombre] || ''),
        rol: idx.rol < 0 ? 'editor' : String(row[idx.rol] || 'editor').trim().toLowerCase(),
        activo: activo === true || String(activo).toUpperCase() === 'TRUE' || String(activo).toLowerCase() === 'si' || activo === '',
      };
    }
  }
  return null;
}

function login_(usuario, password) {
  var cache = CacheService.getScriptCache();
  var key = 'fail_' + usuario.trim().toLowerCase();
  var fails = Number(cache.get(key) || 0);
  if (fails >= MAX_FAILED_LOGINS) {
    throw apiError_('unauthorized', 'Demasiados intentos fallidos. Espera 15 minutos.');
  }
  var user = findUser_(usuario);
  if (!user || !user.activo || user.password !== password) {
    cache.put(key, String(fails + 1), 15 * 60);
    throw apiError_('unauthorized', 'Usuario o contraseña incorrectos.');
  }
  cache.remove(key);
  var payload = { u: user.usuario, exp: Date.now() + TOKEN_DAYS * 24 * 3600 * 1000 };
  return {
    token: sign_(payload),
    user: { usuario: user.usuario, nombre: user.nombre || user.usuario, rol: user.rol },
  };
}

function secret_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('TOKEN_SECRET');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('TOKEN_SECRET', s);
  }
  return s;
}

function sign_(payload) {
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, secret_()));
  return body + '.' + sig;
}

function auth_(token, write) {
  if (!token || String(token).indexOf('.') < 0) throw apiError_('unauthorized', 'Sesión no válida.');
  var parts = String(token).split('.');
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], secret_()));
  if (expected !== parts[1]) throw apiError_('unauthorized', 'Sesión no válida.');
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (!payload.exp || payload.exp < Date.now()) throw apiError_('unauthorized', 'La sesión ha caducado.');
  var user = findUser_(payload.u);
  if (!user || !user.activo) throw apiError_('unauthorized', 'Usuario desactivado.');
  if (write && user.rol === 'lector') throw apiError_('forbidden', 'Tu usuario es de solo lectura.');
  return user;
}

// ------------------------------------------------------------------------------------------
// Tablas
// ------------------------------------------------------------------------------------------

function isDataSheet_(name) {
  return name !== USERS_SHEET && name.charAt(0) !== '_';
}

function readTable_(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length === 0 || (values.length === 1 && values[0].join('') === '')) return { headers: [], rows: [] };
  var tz = Session.getScriptTimeZone();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      var v = values[i][j];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      if (v !== '' && v !== null) empty = false;
      obj[headers[j]] = v;
    }
    if (!empty) rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function version_(rows) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(rows), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function getAll_() {
  var out = {};
  SpreadsheetApp.getActive().getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (!isDataSheet_(name)) return;
    var t = readTable_(sh);
    out[name] = { version: version_(t.rows), rows: t.rows };
  });
  return out;
}

function saveTable_(name, columns, rows, baseVersion) {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(String(name)) || !isDataSheet_(name)) {
    throw apiError_('bad_request', 'Nombre de tabla no válido.');
  }
  if (!Array.isArray(columns) || !Array.isArray(rows)) throw apiError_('bad_request', 'Datos no válidos.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(name);
    if (sh && baseVersion !== null && baseVersion !== undefined) {
      var current = version_(readTable_(sh).rows);
      if (current !== baseVersion) throw apiError_('conflict', 'La tabla ' + name + ' ha cambiado mientras editabas.');
    }
    if (!sh) sh = ss.insertSheet(name);

    var headers = columns.map(function (c) { return String(c.name); });
    var data = rows.map(function (r) {
      return columns.map(function (c) {
        var v = r[c.name];
        if (v === null || v === undefined) return '';
        if (c.type === 'number') return typeof v === 'number' ? v : Number(v) || 0;
        if (c.type === 'boolean') return v === true;
        v = String(v);
        // Evita que un texto se interprete como fórmula.
        if (/^[=+\-@]/.test(v)) v = "'" + v;
        return v;
      });
    });

    sh.clearContents();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (data.length) {
      // Texto, fechas y listas como texto plano para que Sheets no las transforme.
      columns.forEach(function (c, j) {
        if (c.type === 'string' || c.type === 'date' || c.type === 'list') {
          sh.getRange(2, j + 1, data.length, 1).setNumberFormat('@');
        }
      });
      sh.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    SpreadsheetApp.flush();
    return { version: version_(readTable_(sh).rows) };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------------------------------
// Instalación y comprobaciones (ejecutar desde el editor)
// ------------------------------------------------------------------------------------------

/** Crea la pestaña Usuarios con un usuario inicial y genera el secreto de las sesiones. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(USERS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USERS_SHEET, 0);
    sh.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]).setFontWeight('bold');
    sh.getRange(2, 1, 2, USERS_HEADERS.length).setValues([
      ['socio1', 'cambia-esta-clave', 'Socio 1', 'editor', true],
      ['socio2', 'cambia-esta-clave', 'Socio 2', 'editor', true],
    ]);
    sh.getRange('B:B').setNumberFormat('@');
    sh.setFrozenRows(1);
    sh.getRange(5, 1).setValue('rol: editor (puede modificar) o lector (solo ver). activo: TRUE/FALSE.');
  }
  // Quita la pestaña vacía que trae un Sheet nuevo ("Hoja 1", "Sheet1"...).
  ss.getSheets().forEach(function (s) {
    var empty = s.getLastRow() === 0 && s.getLastColumn() === 0;
    if (empty && /^(Hoja|Sheet|Full|Feuille)\s*\d+$/i.test(s.getName()) && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  secret_();
  Logger.log('Listo. Cambia las contraseñas en la pestaña "Usuarios" y despliega como aplicación web.');
}

/** Invalida todas las sesiones abiertas (por ejemplo, si alguien conoce una contraseña antigua). */
function cerrarTodasLasSesiones() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN_SECRET');
  secret_();
  Logger.log('Sesiones cerradas: todos tendrán que volver a entrar.');
}

/** Prueba rápida del backend: login, guardar, leer y detección de conflictos. */
function selfTest() {
  setup();
  var users = usersSheet_().getDataRange().getValues();
  var u = String(users[1][0]);
  var p = String(users[1][1]);
  var session = login_(u, p);
  var bad = false;
  try { login_(u, p + 'x'); } catch (e) { bad = e.code === 'unauthorized'; }
  auth_(session.token, false);

  var name = 'SelfTest'; // pestaña temporal que se borra al final
  var cols = [{ name: 'id', type: 'string' }, { name: 'n', type: 'number' }, { name: 'fecha', type: 'date' }, { name: 'ok', type: 'boolean' }];
  var v1 = saveTable_(name, cols, [{ id: 'a', n: 1.5, fecha: '2027-04-01', ok: true }], null).version;
  var t = readTable_(SpreadsheetApp.getActive().getSheetByName(name));
  var roundTrip = t.rows.length === 1 && t.rows[0].id === 'a' && t.rows[0].n === 1.5 && t.rows[0].fecha === '2027-04-01' && t.rows[0].ok === true;
  var v2 = saveTable_(name, cols, [{ id: 'b', n: 2, fecha: '', ok: false }], v1).version;
  var conflict = false;
  try { saveTable_(name, cols, [], v1); } catch (e) { conflict = e.code === 'conflict'; }
  SpreadsheetApp.getActive().deleteSheet(SpreadsheetApp.getActive().getSheetByName(name));

  var result = { loginOk: !!session.token, loginIncorrectoRechazado: bad, idaYVuelta: roundTrip, versionCambia: v1 !== v2, conflictoDetectado: conflict };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
