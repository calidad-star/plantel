# Plantel Francisco Ballester – app sencilla

Aplicación web instalable (PWA) creada a partir de `Libro1.xlsx`, hoja `C PLANTEL`.

## Qué hace
- 881 registros con datos no vacíos.
- Búsqueda libre.
- Filtros por variedad, propietario, semana y movimiento.
- Ficha completa del registro.
- Funciona sin conexión después de la primera carga.
- Se puede instalar en Android desde Chrome como aplicación.

## Instalación en el móvil
1. Servir esta carpeta desde un sitio HTTPS (por ejemplo, un hosting propio).
2. Abrir la dirección en Chrome Android.
3. Elegir `Instalar aplicación` (o `Añadir a pantalla de inicio`).
4. La app queda como icono independiente.

## Importante
Esta aplicación no modifica directamente el Excel original. Los datos base se cargan desde la copia incluida en `data.js`. Los movimientos se guardan localmente en IndexedDB.

## Versión 2 – funcionamiento local
- IndexedDB para guardar movimientos localmente.
- Funciona sin cobertura después de la primera carga.
- Indicador de conexión.
- Copia de seguridad local en JSON.
- Dropbox OAuth 2.0 y sincronización automática se incorporarán en la siguiente fase.


## Versión 3 – Dropbox OAuth 2.0 + PKCE
- App Key configurada: `etmtuf5ltib9htn`.
- Redirect URI configurada: `https://calidad-star.github.io/plantel/`.
- OAuth 2.0 Authorization Code + PKCE (S256).
- No se utiliza App Secret en el navegador.
- Acceso offline mediante refresh token.
- Los movimientos se sincronizan en Dropbox en `/plantel-sync/movimientos.json`.
- Sincronización al conectar, al recuperar Internet y cada 5 minutos mientras la aplicación está abierta.
- Se realiza una fusión por identificador único de movimiento y fecha de actualización.

### Configuración necesaria en Dropbox
En Dropbox App Console, registra exactamente esta Redirect URI:
`https://calidad-star.github.io/plantel/`

En Permissions, habilita como mínimo:
- `files.metadata.read`
- `files.content.read`
- `files.content.write`

No introduzcas el App Secret en ningún archivo de esta aplicación.


## Versión 3.2 – Corrección IndexedDB

- La base de datos IndexedDB utiliza siempre la versión 2; nunca se solicita una versión inferior.
- Se conserva la base de datos existente y sus movimientos.
- Se mantiene el almacén `dropboxAuth` para los tokens OAuth.
- OAuth 2.0 + PKCE para Dropbox.
- Redirect URI: https://calidad-star.github.io/plantel/
- Archivo de sincronización: `/plantel-sync/movimientos.json`.
- Service Worker actualizado a V3.2 para evitar cargar archivos antiguos desde la caché.

### README en GitHub
El archivo principal de documentación es ahora `README.md`. La dirección correcta es:
https://github.com/calidad-star/plantel/blob/main/README.md


## Versión 3.3 – Corrección Dropbox y Service Worker

- Se mantiene IndexedDB en versión 2 para conservar los movimientos existentes.
- Antes de subir `movimientos.json`, la aplicación crea `/plantel-sync` si no existe.
- Si `/plantel-sync` ya existe, el conflicto se considera correcto.
- Si Dropbox devuelve `401`, se renueva automáticamente el token y se reintenta la operación.
- Los errores de subida muestran el código HTTP y el `error_summary` real devuelto por Dropbox.
- Service Worker actualizado a `plantel-fb-v33`.
- Al activar V3.3 se eliminan cachés antiguas y se toma el control de las páginas abiertas.
