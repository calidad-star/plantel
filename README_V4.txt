# Plantel Francisco Ballester V4.0

## Qué cambia
- Recupera la última copia del Excel guardada localmente al abrir la aplicación.
- Al iniciar con Dropbox conectado, descarga de nuevo el Excel maestro y actualiza la interfaz.
- El botón principal pasa a llamarse «Actualizar ahora».
- La descarga de Dropbox evita la caché HTTP del navegador.
- El Service Worker V4 prioriza la red para HTML, JavaScript y CSS, y elimina cachés antiguas.
- El parser localiza la primera hoja mediante las relaciones del libro y busca las cabeceras en las primeras 25 filas.
- Se conservan las 19 columnas autorizadas.
- Se crea un almacén IndexedDB `masterCache` con versión 3, sin borrar los movimientos ni la autorización de Dropbox existentes.

## Publicación
1. Haz una copia de seguridad de la carpeta y de `movimientos.json` en Dropbox.
2. Sustituye los archivos de la web por los incluidos en este paquete.
3. Mantén la misma URL publicada y el mismo `redirectUri` OAuth: `https://calidad-star.github.io/plantel/`.
4. Abre la aplicación y pulsa «Actualizar ahora».
5. Si Dropbox pide autorización, vuelve a conectar y acepta los permisos solicitados.

## Actualizar el Excel
- Si el Excel maestro ya está en Dropbox, reemplaza `/plantel-sync/Libro1_maestro.xlsx` por el nuevo archivo, conservando exactamente ese nombre.
- Alternativamente, usa «Subir Excel maestro» desde la aplicación.
- Después pulsa «Actualizar ahora» o vuelve a abrir la aplicación con conexión.

## Importante
- `data.js` queda como copia de respaldo inicial/offline. La fuente de datos actualizada es el Excel maestro de Dropbox.
- Los movimientos se mantienen en `movimientos.json` y no se mezclan con los registros del Excel.
- No borres los datos del navegador ni la base IndexedDB: la V4 conserva los almacenes existentes.
- La aplicación necesita que el Excel mantenga las 19 cabeceras configuradas.
