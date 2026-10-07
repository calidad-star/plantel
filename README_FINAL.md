# Plantel Francisco Ballester – Android

Aplicación Android para consulta de la hoja **C PLANTEL** del Excel de Francisco Ballester.

## Estado
- Proyecto Android Studio Kotlin + Jetpack Compose.
- Lectura específica de la hoja `C PLANTEL` (no de la primera hoja del libro).
- 923 filas y 75 columnas detectadas en el Excel suministrado.
- Búsqueda global y ficha completa.
- Sincronización manual desde Dropbox mediante API.
- Compatible con Android 8.0+ (API 26).

## Compilación del APK
Abrir el proyecto en Android Studio y ejecutar `Build > Build APK(s)`.
El APK de debug se genera en `app/build/outputs/apk/debug/app-debug.apk`.

## Dropbox
La versión actual usa token de acceso de Dropbox. Para producción empresarial se recomienda implementar OAuth 2.0 + PKCE y almacenamiento seguro del token.
