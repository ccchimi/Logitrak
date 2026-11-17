# Logitrak · Mobile App

Guía específica de instalación, configuración y ejecución de la aplicación móvil de Logitrak para **Android e iOS**.

La Mobile App usa Expo, React Native y TypeScript y comparte el código de [`frontend/`](../../frontend/) con la versión web. Esta carpeta contiene documentación: no requiere copiar el código ni mantener otro proyecto móvil.

- [Frontend Web y arquitectura del cliente](../../frontend/README.md).
- [Descripción general del proyecto](../../README.md).
- [API y configuración del backend](../../backend/README.md).

## Funcionalidades y alcance

El código móvil contempla registro e inicio de sesión, cotización con Boxy, pago y seguimiento de envíos, calificación del chofer, historial, perfil, cupones, soporte y notificaciones. El flujo de chofer incluye postulación, DNI, selfie, vehículo, ofertas filtradas por peso y bultos, avances, entrega con PIN y foto, y su promedio de calificaciones. Soporte y administración acceden a las pantallas y operaciones que permiten sus capacidades.

Estas funciones dependen del backend y de la configuración de cada integración. Para validar cada versión, seguí las comprobaciones de esta guía y registrá los resultados por plataforma y tipo de build.

El pago directo con tarjeta es simulado y la edición de varios datos de perfil está limitada. RENAPER real está pendiente de implementación en backend. Las restricciones compartidas se detallan en los README de frontend y backend.

## Tecnologías y archivos de referencia

| Área | Implementación |
|---|---|
| Aplicación | Expo SDK 58, React Native 0.88, React 19.3 y TypeScript 6.0 |
| Navegación | React Navigation 7 y stack nativo |
| Desarrollo nativo | `expo-dev-client` y comandos `expo run:android` / `expo run:ios` |
| Mapas y ubicación | `react-native-maps`, `expo-location` y recorridos solicitados al backend |
| Captura e identidad | `expo-camera`, lectura PDF417 y ML Kit para detección facial/prueba de vida compatible |
| Notificaciones | `expo-notifications`, Expo Push y credenciales de plataforma |
| Sesión y preferencias | AsyncStorage; tema y modo silencioso locales |
| Compilación | Perfiles de EAS Build en `frontend/eas.json` |
| Configuración | `frontend/app.json`, `frontend/app.config.js` y `frontend/.env.example` |

Identificadores declarados en `app.json`:

| Plataforma | Identificador |
|---|---|
| Android | `com.logitrak.frontend` |
| iOS | `com.logitrak.frontend.ios` |

Las claves de mapas, certificados, credenciales de notificaciones y firma deben corresponder al identificador de cada plataforma y al build instalado.

## Requisitos

Para ambas plataformas:

- Git, npm y **Node.js 22.13.0 o superior**, el mínimo de Expo SDK 58.
- Una API de desarrollo alcanzable desde el teléfono o emulador; no es necesario iniciar el backend local si ya existe ese entorno.
- Un dispositivo o emulador compatible. Cámara, documentos, ubicación y push deben validarse también en dispositivos físicos cuando corresponda.

Para compilar localmente en Android, necesitás Android Studio, Android SDK, JDK y un emulador configurado o un teléfono con depuración USB habilitada. Usá versiones compatibles con Expo SDK 58.

Para compilar localmente en iOS, necesitás macOS, Xcode, sus herramientas de línea de comandos y dependencias nativas, incluido CocoaPods. La ejecución en dispositivo requiere configurar la firma. Las credenciales de Apple/APNs y los requisitos de distribución deben resolverse según el tipo de build.

Para compilar en EAS, necesitás una cuenta Expo con acceso al proyecto del equipo y sus credenciales. `eas.json` declara EAS CLI `>= 20.1.0`; no es necesario crear otro proyecto Expo para seguir esta guía.

## Instalación de dependencias

Desde una terminal, cloná el repositorio si todavía no lo tenés:

```bash
git clone https://github.com/ccchimi/Logitrak.git
cd Logitrak/frontend
npm ci
cp .env.example .env
```

Si ya tenés el repositorio, entrá directamente en `frontend/`, instalá con `npm ci` y creá `.env` solo si aún no existe. No reemplaces una configuración local válida sin revisar sus valores.

Los comandos de las siguientes secciones se ejecutan desde **`Logitrak/frontend/`**, no desde `docs/mobile/`.

## Configuración del entorno móvil

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API alcanzable por el dispositivo. |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` | Clave de Maps SDK para Android incorporada al build. |
| `EXPO_PUBLIC_SENTRY_DSN` | Reporte opcional de errores del cliente. |
| `GOOGLE_SERVICES_JSON` | Ruta/variable de archivo de Firebase para Android cuando se configura en el build. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Configuración privada de Sentry durante el build, si se usa. |

`EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` corresponde al navegador; no habilita los mapas nativos de Android. La configuración actual inyecta la clave de Maps solo en Android. `MapaSeguimiento.tsx` fuerza `PROVIDER_GOOGLE` también en iOS, pero los archivos Expo versionados no configuran su clave nativa iOS: no hay una selección automática de Apple Maps. Falta completar esa integración y validar el build antes de presentar el mapa iOS como funcional.

Las variables `EXPO_PUBLIC_*` viajan en la aplicación y no son secretas. La clave de Android se restringe en Google Cloud por package, huella de firma y API. Las credenciales privadas de servidor no van en la app.

### Conexión con el backend

El archivo de ejemplo apunta al servicio del equipo en Render. Podés usar una API pública de desarrollo o una API local accesible por red.

En un teléfono físico, `localhost` apunta al propio teléfono. Para una API que corre en tu computadora, configurá su IP LAN y puerto y verificá que el teléfono pueda alcanzarla. La computadora y el dispositivo deben tener conectividad entre sí. El túnel de Metro no publica automáticamente el backend.

Las direcciones especiales de red de los emuladores dependen de la plataforma; configurá explícitamente una URL que puedas alcanzar desde ese emulador. Reiniciá Metro cuando cambies variables y reconstruí el binario cuando cambies configuración o dependencias nativas.

Para pruebas que creen o modifiquen datos, utilizá una API y cuentas destinadas a pruebas. No ingreses tarjetas reales en el procesador simulado.

### Configuración en EAS

Los builds de EAS necesitan las variables correspondientes en su entorno de compilación. La configuración de Render es independiente y no se transfiere al build móvil.

`app.config.js` toma `GOOGLE_SERVICES_JSON` o un `google-services.json` local si existe. Las credenciales FCM para enviar push se configuran además en EAS; el archivo de configuración de Firebase por sí solo no completa esa integración. Para iOS deben resolverse APNs y la firma requeridos por la plataforma.

## Ejecutar Android con build local

1. Iniciá un emulador o conectá un teléfono con depuración USB y autorización de la computadora.
2. Desde `frontend/`, ejecutá:

```bash
npm run android
```

El script invoca `expo run:android`, genera o utiliza el proyecto nativo y compila/instala la aplicación en un destino compatible. La primera compilación requiere más tiempo y la descarga de herramientas y dependencias.

Una vez instalado el build de desarrollo, podés iniciar Metro explícitamente con:

```bash
npx expo start --dev-client
```

Abrí el cliente de desarrollo de Logitrak y conectalo a ese servidor. Una modificación de JavaScript/TypeScript normalmente no necesita recompilar el binario; añadir módulos nativos o cambiar su configuración sí puede requerirlo.

## Ejecutar iOS con build local

1. Abrí un simulador desde Xcode o prepará un dispositivo y su firma.
2. Desde `frontend/`, ejecutá:

```bash
npm run ios
```

El script invoca `expo run:ios`. El destino físico y las capacidades de plataforma pueden requerir pasos adicionales de Xcode y firma. Tras instalar un build de desarrollo, usá `npx expo start --dev-client` para iniciar Metro cuando sea necesario.

Antes de distribuir un build iOS, verificá en el proyecto remoto la firma, las credenciales APNs y el tipo de distribución, y completá el recorrido funcional en el dispositivo de destino.

## Probar en un iPhone con Expo Go

Sin un build propio de iOS, la app se puede abrir en un iPhone con Expo Go, la app de Expo del App Store (tiene que ser la versión de SDK 58). Desde `frontend/`:

```bash
npx expo start --go
```

El parámetro `--go` es necesario: como el proyecto tiene `expo-dev-client`, `npx expo start` arma por defecto un QR para el build de desarrollo, y la cámara del iPhone responde que no encontró datos utilizables. Con `--go`, el QR abre Expo Go. El teléfono y la computadora tienen que estar en la misma red; si no, usá `npx expo start --go --tunnel`, que requiere `npx expo login`.

En Expo Go no funcionan las notificaciones push ni la prueba de vida con ML Kit, que necesitan un build propio. Para recorrer la app completa en iOS hace falta un build de EAS, con la firma y las credenciales de Apple.

## Alternativa: compilar con EAS

El archivo `frontend/eas.json` ya incluye:

| Perfil | Configuración declarada y finalidad |
|---|---|
| `development` | `developmentClient: true` y distribución interna; cliente de desarrollo para usar con Metro. |
| `preview` | Distribución interna; build para probar o compartir sin tratarlo como publicación en tiendas. |
| `production` | Incremento automático de versión; preparación de builds para distribución productiva. |

El perfil `preview` es un perfil de compilación; no es una vista previa local ni permite evitar el inicio de sesión.

Con una versión compatible de EAS CLI, acceso al proyecto y variables/credenciales preparadas, estos son los comandos de referencia:

```bash
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Para una compilación interna Android con el perfil existente:

```bash
npx eas-cli build --platform android --profile preview
```

Android con distribución interna puede generar un APK instalable. Descargá el resultado desde el enlace del build e instalalo en un dispositivo autorizado. Un AAB de distribución para Google Play no se instala directamente como un APK.

Para un build iOS:

```bash
npx eas-cli build --platform ios --profile development
```

Los perfiles actuales no declaran `ios.simulator: true`: ese comando no debe presentarse como una compilación de simulador ya configurada. La distribución interna en un iPhone requiere la firma y dispositivos autorizados que correspondan. Compilar en EAS o con `npm run ios` tampoco publica automáticamente la aplicación en una tienda.

## Capacidades y limitaciones de plataforma

| Función | Qué comprobar |
|---|---|
| Cámara y DNI | Permiso de cámara, lectura PDF417 y captura de frente/selfie en el dispositivo. |
| Prueba de vida | ML Kit requiere código nativo y un build compatible; no asumir funcionamiento completo en Expo Go. |
| Comparación facial | Depende del runtime y modelos del backend, además de las imágenes enviadas. |
| Ubicación del chofer | La publicación de GPS real del conductor al mapa está pendiente, también en primer plano. El componente muestra un marcador animado de demostración. `expo-location` se usa para geocodificar direcciones; mostrar la ubicación del dispositivo que consulta el mapa no equivale a ubicar al chofer remoto. |
| Mapa | `MapaSeguimiento.tsx`; la ruta por calles se obtiene de `/api/recorridos`, con `GOOGLE_DIRECTIONS_KEY` solo en servidor. El movimiento del marcador es simulado y la configuración de Google Maps iOS está pendiente. |
| Push | Dispositivo, permisos, credenciales FCM/APNs, registro de token y entrega por Expo. |
| Sesión | Persistencia local y renovación con refresh; el uso de un almacén seguro nativo sigue pendiente. |
| Preferencias | Tema y modo silencioso locales; el modo silencioso no está aplicado globalmente al sonido push. |
| Identidad oficial | RENAPER real no está implementado aunque existan nombres de variables para configurarlo. |

Expo Go puede servir para comprobaciones parciales, pero no es el entorno de referencia para verificar todos los módulos nativos de este proyecto. Las suscripciones Realtime, mapas y pagos también necesitan validar su configuración del lado del servidor.

## Comprobaciones antes de demostrar la app

Desde `frontend/`:

```bash
npm run typecheck
npm test -- --runInBand
npm run verify:backend
```

Los dos primeros comandos comprueban tipos y pruebas unitarias compartidas. El tercero consulta salud del backend; ninguno reemplaza pruebas en un teléfono.

Con cuentas y datos de prueba, verificá manualmente:

1. Instalación, apertura, registro/login, restauración y cierre de sesión.
2. Cotización con Boxy, creación de pedido y pago mediante un circuito de prueba autorizado.
3. Seguimiento y consulta de historial, con conectividad y permisos adecuados.
4. Flujo de chofer: postulación, documento/selfie y toma de una oferta compatible.
5. Avances y cierre de entrega con PIN y foto.
6. Notificaciones, soporte, preferencias y mensajes ante errores de red.

Registrá plataforma, dispositivo, tipo de build y resultado para dejar constancia del alcance de cada prueba.

## Archivos generados y documentación relacionada

`node_modules/`, las carpetas nativas generadas `android/` e `ios/`, los archivos `.env` reales y credenciales privadas están excluidos por las reglas actuales de Git. El código fuente y los archivos de configuración versionados permiten regenerar el proyecto nativo. No publiques claves de firma, cuentas de servicio ni datos personales usados durante pruebas.

Consultá los [pendientes del proyecto](../pendientes-logitrak.md), el [plan de mantenimiento](../qa/plan-de-mantenimiento.md) y el [README del backend](../../backend/README.md) para restricciones de perfil, identidad, pagos y operación.

Referencias oficiales para los comandos y tipos de build:

- [Builds de desarrollo de Expo](https://docs.expo.dev/develop/development-builds/create-a-build/).
- [Configuración de perfiles EAS](https://docs.expo.dev/build/eas-json/).
- [APK para dispositivos y emuladores Android](https://docs.expo.dev/build-reference/apk/).
