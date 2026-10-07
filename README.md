# Plantel Francisco Ballester – Android

Proyecto inicial Android Studio (Kotlin + Jetpack Compose) para consultar la hoja **C PLANTEL** del Excel de Francisco Ballester y actualizarla desde Dropbox.

## Funciones incluidas
- Lectura directa de `xl/worksheets/sheet1.xml` y `sharedStrings.xml`, sin necesidad de convertir el Excel.
- Consulta y búsqueda global de los registros.
- Ficha completa de cada registro.
- Sincronización manual con Dropbox mediante `/2/files/download`.
- Configuración de token de Dropbox y ruta del fichero.
- Conserva los datos calculados guardados por Excel (valores almacenados/cached), por lo que el Excel debe guardarse antes de sincronizar.

## Abrir
1. Instalar Android Studio reciente.
2. Abrir esta carpeta como proyecto.
3. Esperar la sincronización de Gradle.
4. Ejecutar en un teléfono Android o emulador.

## Dropbox
Para la primera versión se utiliza un token de acceso introducido en Configuración. Para producción recomiendo sustituirlo por **OAuth 2.0 con PKCE**, de modo que cada usuario autorice Dropbox sin guardar manualmente tokens.

Ruta por defecto:
`/PLANTEL/01. RG07-PR03 PLANTACIONES COL 26_11.xlsx`

## Importante sobre Excel
La aplicación lee los valores calculados que Excel haya guardado. Si se modifica una fórmula o un dato, hay que guardar el Excel antes de pulsar Actualizar.

## Siguiente versión recomendada
- OAuth Dropbox seguro.
- Base de datos local para trabajar sin cobertura.
- Sincronización automática periódica.
- Filtros por semana, variedad, propietario, municipio y cultivo.
- Panel de stock de lisa/rizada/lombarda.
- Alertas de stock bajo.
- Calendario de plantación y recolección.
- Usuarios y permisos.
- Exportación/compartición de registros.
