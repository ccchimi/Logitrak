# Logitrak · Aplicación

Esta es la aplicación de Logitrak, construida con Expo y React Native sobre
TypeScript. Una sola base de código corre en web, Android e iOS, y cubre el
recorrido completo del usuario: cotizar un envío conversando con Boxy, pagarlo,
seguirlo en el mapa y, si le interesa, postularse como chofer pasando por la
verificación de identidad.

## Con qué está hecha

Corre sobre Expo SDK 54 con React Native 0.81 y React 19, y la navegación la
resuelve React Navigation con un stack nativo. Los mapas y el trazado de rutas
salen de `react-native-maps` junto con `react-native-maps-directions`, mientras
que la ubicación la maneja `expo-location`. Para la verificación de identidad
usamos `expo-camera` para capturar y `@react-native-ml-kit/face-detection` para
la prueba de vida. La tipografía combina Syne y DM Sans, y los degradados salen
de `expo-linear-gradient`; el resto de la interfaz son componentes propios.

## Boxy, el motor de cotización

Boxy vive en `src/services/botLogistica/` y es la pieza que más nos interesa
defender del proyecto. No es un modelo de lenguaje ni llama a ningún servicio
externo: es un motor de inferencia basado en reglas que corre íntegramente en el
dispositivo. Esa decisión no fue por simplicidad, sino porque acá se calculan
precios y se manejan domicilios. Un motor determinista siempre devuelve lo mismo
ante la misma entrada, no puede inventar una tarifa, y ningún dato del usuario
sale del teléfono.

Internamente se reparte en cuatro responsabilidades. El procesamiento de lenguaje
(`nlp.ts` y `conversacion.ts`) interpreta las respuestas del usuario mientras le
va pidiendo los datos: reconoce afirmaciones y negaciones, extrae números aunque
vengan escritos con palabras, normaliza unidades y detecta texto ilegible. El
análisis de direcciones (`direcciones.ts`) valida origen y destino contra la zona
de cobertura, corrige la localidad cuando hace falta y estima la distancia. La
clasificación de carga (`cargas.ts`) deduce de qué tipo de envío se trata y si
requiere algo especial, como cadena de frío. Por último, `tarifas.ts` elige el
vehículo más barato que cubra peso, bultos y volumen, y arma el desglose del
precio contemplando franja horaria, día, demanda de la zona, peajes, seguro y
peso volumétrico.

Lo que devuelve es una cotización explicada, con su nivel de confianza, que
después se confirma contra la API.

## Recorrido de pantallas

```
Inicio (landing)
   └─► Login ──► Registro · Recuperar contraseña
          └─► Home
                 ├─► SolicitudEnvio → Pago → Seguimiento
                 ├─► Historial
                 ├─► Perfil
                 ├─► TrabajaConNosotros
                 └─► Chofer
```

El pago (`PagoScreen`) se ubica entre la solicitud y el seguimiento, y ofrece QR
de Mercado Pago o MODO además del pago con tarjeta. El seguimiento
(`SeguimientoScreen` junto a `MapaSeguimiento`) dibuja la ruta y consulta el
estado real del envío cada pocos segundos, así que el chofer y la unidad que se
muestran son los que efectivamente tomaron el viaje. Como Google Maps se integra
distinto en navegador que en nativo, ese componente tiene una variante `.web.tsx`
propia.

La consola del chofer (`ChoferScreen`) funciona como un tablero de envíos
disponibles: lista los que su vehículo puede transportar, le permite tomar uno y
después ir marcando los hitos del viaje, que es lo que alimenta el seguimiento
que ve el cliente.

El alta de chofer (`TrabajaConNosotros`, con `EscanerIdentidad`, `dniService` y
`livenessService`) pide los datos personales, el vehículo con el que va a
trabajar, el escaneo del código PDF417 del DNI y una selfie con prueba de vida.

## Estructura de carpetas

```
frontend/
├─ App.tsx                  # Landing, transición animada y AppNavigator
├─ app.config.js            # Config dinámica de Expo (clave de Maps, permisos)
├─ src/
│  ├─ navigation/           # Stack navigator y contexto de flujo raíz
│  ├─ screens/              # Las pantallas (.tsx)
│  ├─ styles/               # Las hojas de estilo de cada pantalla (.ts)
│  ├─ components/           # Inputs, mapa, escáner de identidad, avisos
│  ├─ services/             # Cliente de API y servicios por dominio
│  │  └─ botLogistica/      # Boxy: NLP, direcciones, cargas y tarifas
│  └─ theme/                # Paleta de colores
└─ assets/                  # Íconos y splash
```

Separamos los estilos de las pantallas para que `screens/` quede con un solo
archivo por vista y sea más fácil de recorrer. Todos los servicios de
`src/services/` hablan con la API a través del cliente común `services/api.ts`,
que centraliza la URL base y el token de sesión.

## Qué necesitás para correrla

Hace falta Node.js 20 o superior, la aplicación Expo Go en el teléfono o bien un
emulador de Android o iOS, y una instancia de la API alcanzable desde ese
dispositivo.

## Configuración

Copiá `.env.example` a `.env` y completá las variables:

```ini
# URL de la API. Conviene fijarla a la IP de tu red local para que funcione
# igual en web, emulador e iPhone. Si queda vacía se intenta deducir desde
# Metro, pero eso falla en modo túnel y a veces en el emulador.
EXPO_PUBLIC_API_URL=http://192.168.1.70:4000

# Claves de Google Maps (mapa y ruteo)
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=...
EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY=...
EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY=...
```

Todo lo que empieza con `EXPO_PUBLIC_` queda embebido en el bundle, así que ahí
no van secretos de servidor. Conviene además restringir cada clave de Google por
nombre de paquete y huella SHA-1, porque de lo contrario cualquiera que abra el
bundle puede reutilizarlas. El archivo `.env` está en `.gitignore`.

## Cómo levantarla

```bash
cd frontend
npm install
npm start          # abre Metro: escaneá el QR con Expo Go o elegí plataforma
```

También están los atajos `npm run web`, `npm run android` y `npm run ios` para ir
directo a una plataforma.

## Cosas a tener en cuenta

La landing se muestra primero en todas las plataformas y entra al login con una
transición animada, que se arma en `App.tsx`.

La prueba de vida con ML Kit no funciona en Expo Go, porque necesita módulos
nativos: para probarla hay que generar un dev build con `expo run:android`. En
Expo Go el alta de chofer sigue andando, pero degradando a las capas de
verificación que no dependen de código nativo.

Por último, Expo cambia bastante entre versiones, así que antes de tocar código
conviene mirar la documentación de la versión que estamos usando en lugar de la
genérica.
