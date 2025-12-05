# Generar APK (Android) usando Capacitor

Estos son pasos recomendados para convertir la aplicación web (Vite + React) en una APK con Capacitor.

Requisitos previos:
- Tener Node.js y npm instalados.
- Tener Android Studio instalado (incluye el SDK y la herramienta de compilación Gradle) y configurar variables de entorno (ANDROID_HOME / ANDROID_SDK_ROOT).
- Tener Java JDK instalado.

Pasos:

1. Instalar dependencias (si no lo has hecho ya):

```bash
npm install
```

2. Instalar las dependencias de Capacitor (si no están instaladas) y agregar Android:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android --save
```

3. Inicializar Capacitor (sólo la primera vez):

```bash
npm run cap:init
```

4. Construir tu app web y copiar los assets al proyecto Capacitor:

```bash
npm run build
npm run cap:copy
```

5. Abrir el proyecto Android y compilar APK desde Android Studio:

```bash
npm run cap:open:android
```

6. Alternativamente, desde la carpeta `android` del proyecto puedes generar una APK con Gradle (en entornos CI/CLI):

```bash
cd android
./gradlew assembleDebug   # o assembleRelease
```

Notas:
- Si deseas que el APK use feature nativas o permisos (ej. acceso a micrófono), tendrás que añadir plugins de Capacitor y configurar permisos en `android/app/src/main/AndroidManifest.xml`.
- Para distribuir en Google Play usa `assembleRelease` y firma tu APK / genera un AAB.

## Integración Continua (GitHub Actions) ✅

Puedes automatizar la compilación (AAB / APK) con GitHub Actions. He incluido un workflow de ejemplo en `.github/workflows/android-ci.yml` que hace lo siguiente:

- Instala Node, JDK y dependencias.
- Ejecuta `npm run build` y `npm run cap:copy`.
- Llama a `./gradlew bundleRelease` para generar un AAB y `./gradlew assembleRelease` para APK.
- Sube los artefactos (AAB/APK) como artefactos de la ejecución.

Si quieres que el workflow también firme la AAB/APK automáticamente, crea estos secretos en tu repositorio:

- `ANDROID_KEYSTORE` — contenido del keystore binario codificado en base64 (por ejemplo `base64 my-release-key.jks | pbcopy`).
- `ANDROID_KEYSTORE_PASSWORD` — contraseña del keystore.
- `ANDROID_KEY_ALIAS` — alias de la clave.
- `ANDROID_KEY_PASSWORD` — contraseña de la clave.

El workflow decodificará `ANDROID_KEYSTORE` en `android/keystore.jks` y creará `android/keystore.properties` con las demás variables. No subas keystores ni passwords al repo.

Nota: el archivo `android/app/build.gradle` en este proyecto está preparado para leer `android/keystore.properties` si existe y aplicar la configuración de firmado (signingConfig) en la variante `release`. Con esto, cuando la CI escriba la `keystore.properties`, las tareas `bundleRelease` / `assembleRelease` generarán artefactos firmados.

## Firmado local / generación manual del keystore 🔐

1. Generar un keystore (localmente):

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. Para construir y firmar localmente con Android Studio: `Build -> Generate Signed Bundle / APK` y sigue el asistente.

3. Para firmar desde CLI usando `keystore.properties`, guarda un archivo `android/keystore.properties` (NO lo subas al repo) con:

```
storeFile=keystore.jks
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

4. Y ejecuta desde la carpeta android:

```bash
./gradlew bundleRelease  # genera AAB
./gradlew assembleRelease  # genera APK
```

### Archivos importantes y dónde encontrarlos

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk` (si no firmas, será sin firmar)
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

He añadido también un archivo de ejemplo `android/keystore.properties.example` y un workflow en `.github/workflows/android-ci.yml`.

## Guardar APK dentro del repositorio (opcional)

Si prefieres que el CI deje el APK dentro del repositorio para descarga rápida, el workflow en este repo puede crear/actualizar una rama dedicada `apk-builds` y añadir los artefactos (AAB/APK/debug) allí con nombres que incluyan el tag/timestamp. Esto es útil para probar versiones sin firmar o para mantener un histórico de builds sin ensuciar la rama `main`.

Ejemplo de archivos que se crearían en la rama `apk-builds`:

- `apk/v1.0.0-20251128T010203-app-debug.apk`
- `apk/v1.0.0-20251128T010203-app-release.aab`

El flujo por defecto actual agrega los artefactos a `apk-builds` únicamente cuando la CI corre por un tag `v*` o cuando se publica una Release.
