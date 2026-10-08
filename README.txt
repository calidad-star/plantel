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
