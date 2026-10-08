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
Esta primera versión NO modifica el Excel ni sincroniza Dropbox. Es una aplicación de consulta basada en una copia de los datos del Excel.


## Versión 2 – funcionamiento local
- IndexedDB para guardar movimientos localmente.
- Funciona sin cobertura después de la primera carga.
- Indicador de conexión.
- Copia de seguridad local en JSON.
- Dropbox OAuth 2.0 y sincronización automática se incorporarán en la siguiente fase.
