# Plantel Francisco Ballester — V3.6 actualizada

## Cambios de V3.6 actualizada

- Los datos maestros proceden exclusivamente de estas 19 columnas del Excel:
  Nº, SEMANA, FECHA, PLANTEL, VARIEDAD, TIPO,
  BANDEJAS 16 B/hg (=Z02*15,78), PLANTAS merma 8%,
  DÍA RECOLECCIÓN (100), PROPIETARIO, CERTIFICADO RIEGO,
  SUPERFICIE (hanegadas), Densidad plantas (p/hg) 3775 p/hg,
  POLIGONO, PARCELA, MUNICIPIO,
  ACEQUIA confirmada (Con certticado color verde), CULTIVO, LOTE SIEMBRA.
- Se ignoran las demás columnas del Excel.
- Filtros: TIPO, SEMANA, MES, PROPIETARIO y PLANTEL.
- Se mantiene el filtro por VARIEDAD y la búsqueda libre, limitada a las 19 columnas.
- MES se calcula a partir de FECHA; no es una columna adicional del Excel.
- IndexedDB continúa en versión 2 para conservar los movimientos existentes.
- Dropbox separa los datos maestros del Excel de los movimientos:
  - /plantel-sync/Libro1_maestro.xlsx
  - /plantel-sync/movimientos.json
- Al abrir la aplicación con Dropbox conectado, intenta actualizar automáticamente el Excel maestro.
- El botón “Sincronizar” actualiza el Excel maestro y sincroniza los movimientos.
- “Subir Excel maestro” permite reemplazar el Excel maestro de Dropbox. El parser solo lee las 19 columnas autorizadas.
- OAuth solicita explícitamente files.metadata.read, files.content.read y files.content.write y permite volver a autorizar para obtener un token con esos permisos.
- Service Worker actualizado a v3.6 y elimina cachés antiguas.

## Flujo recomendado

1. En Dropbox App Console activa:
   files.metadata.read
   files.content.read
   files.content.write
2. Vuelve a autorizar Dropbox desde la aplicación para obtener un token nuevo con esos scopes.
3. Usa “Subir Excel maestro” y selecciona el Excel actualizado.
4. A partir de entonces, si el mismo archivo maestro se sustituye en Dropbox, al abrir la aplicación o pulsar “Sincronizar” se descargará y se actualizarán los datos maestros.
5. Los movimientos locales permanecen separados y no se borran al actualizar el Excel.

## Importante

La aplicación no modifica el Excel de Dropbox cuando se registran movimientos. El Excel es la fuente de datos maestros; movimientos y datos maestros son conjuntos independientes.

El archivo `Libro1_maestro.xlsx` incluido en este paquete contiene únicamente las 19 columnas seleccionadas.


V3.6 actualizada: el encabezado principal de cada registro muestra PROPIETARIO. Los valores numéricos se muestran redondeados a cero decimales en la interfaz, manteniendo los datos originales internamente.


Buscadores en orden: PLANTEL, TIPO, VARIEDAD, MESES, SEMANA, PROPIETARIO, VARIEDADES. No se muestran opciones TODOS/TODAS. Los meses se ordenan enero-diciembre.
