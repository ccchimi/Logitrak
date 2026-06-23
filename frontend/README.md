# Logitrak — App (Frontend)

App de **Logitrak** construida con **Expo + React Native (TypeScript)**. Un solo
código corre en **web, Android e iOS**: el cliente cotiza un envío conversando
con **Boxy** (el asistente de logística on-device), paga, sigue su pedido en un
mapa en tiempo real y, si quiere, se postula como chofer con verificación de
identidad por cámara.

## Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Expo SDK 54 · React Native 0.81 · React 19 |
| Lenguaje | TypeScript |
| Navegación | React Navigation (native-stack) |
| Mapas | `react-native-maps` + `react-native-maps-directions` |
| Cámara / biometría | `expo-camera` · `@react-native-ml-kit/face-detection` |
| Ubicación | `expo-location` |
| Tipografías | Syne + DM Sans (`@expo-google-fonts/*`) |
| UI | Componentes propios + `expo-linear-gradient` |

## Boxy — el motor de cotización on-device

Boxy (`src/services/botLogistica/`) es un **motor de inferencia que corre 100%
en el dispositivo**, sin llamar a ningún servicio externo para cotizar. Resuelve
todo el flujo conversacional y de pricing:

- **NLP liviano** (`nlp.ts`, `conversacion.ts`): interpreta respuestas en
  lenguaje natural, detecta afirmaciones/negaciones, extrae números y corrige
  texto ilegible mientras va pidiendo los datos del envío.
- **Análisis de direcciones** (`direcciones.ts`): valida origen/destino contra
  la zona de cobertura, corrige localidades y estima la distancia.
- **Clasificación de carga** (`cargas.ts`): infiere el tipo de carga y si
  requiere capacidades especiales (cadena de frío, voluminosa, peligrosa).
- **Selección de flota + tarifas** (`tarifas.ts`): elige el vehículo de menor
  costo que cubre peso facturable, bultos y volumen, y arma el desglose con
  **pricing dinámico** (franja horaria, día, índice de demanda, peajes, seguro,
  peso volumétrico) más ETA de retiro y ventana de entrega.

El resultado es una cotización explicada (con nivel de confianza) que luego se
confirma contra la API.

## Pantallas y flujo

```
Inicio (landing)
   └─► Login ──► Registro · Recuperar contraseña
          └─► Home (chat con Boxy)
                 ├─► SolicitudEnvio  → Pago → Seguimiento (mapa en vivo)
                 ├─► Historial
                 ├─► Perfil
                 ├─► TrabajaConNosotros (postulación + verificación de identidad)
                 └─► Chofer (panel del chofer: viajes ofrecidos/aceptados)
```

- **Pago** (`PagoScreen`): QR de Mercado Pago / MODO o tarjeta, entre la
  solicitud y el seguimiento.
- **Seguimiento** (`SeguimientoScreen` + `MapaSeguimiento`): mapa con la ruta y
  los hitos del envío. Tiene una variante `.web.tsx` para correr en navegador.
- **Verificación de identidad** (`EscanerIdentidad`, `dniService`,
  `livenessService`): escaneo del PDF417 del DNI, selfie y prueba de vida con
  ML Kit en el alta de chofer.

## Estructura

```
frontend/
├─ App.tsx                  # Landing → transición animada → AppNavigator
├─ app.config.js            # Config dinámica de Expo (Maps key, permisos)
├─ src/
│  ├─ navigation/           # Stack navigator + contexto de flujo raíz
│  ├─ screens/              # Una pantalla = <Pantalla>.tsx + <Pantalla>Styles.ts
│  ├─ components/           # Inputs, mapa, escáner de identidad, toasts, etc.
│  ├─ services/             # Cliente de API + servicios por dominio
│  │  └─ botLogistica/      # Boxy: NLP, direcciones, cargas, tarifas, asignaciones
│  └─ theme/                # Paleta de colores
└─ assets/                  # Íconos y splash
```

Cada servicio en `src/services/` (envios, pagos, cotizaciones, choferes,
seguimiento, …) habla con la API a través del cliente común `services/api.ts`.

## Requisitos

- Node.js 20+
- App **Expo Go** (para probar en el teléfono) o un emulador Android / iOS
- Una instancia de la API de LogiTrack corriendo y alcanzable desde el
  dispositivo

## Configuración (`.env`)

Copiá `.env.example` a `.env` y completá:

```ini
# URL de la API. Fijala a la IP LAN de tu PC para que ande igual en web,
# emulador Android e iPhone. Si no se define, se intenta resolver desde Metro
# (falla en modo túnel y a veces en emulador).
EXPO_PUBLIC_API_URL=http://192.168.1.70:4000

# Claves de Google Maps (mapa + ruteo)
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=...
EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY=...
EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY=...
```

> Las variables `EXPO_PUBLIC_*` se inyectan en build time. El archivo `.env`
> está en `.gitignore`.

## Cómo correrlo

```bash
cd frontend
npm install
npm start          # abre Metro: escaneá el QR con Expo Go o elegí plataforma

# atajos
npm run web        # navegador
npm run android    # dev build / emulador Android
npm run ios        # dev build / simulador iOS
```

## Notas

- La **landing (`Inicio`) se muestra primero en todas las plataformas** y entra
  al login con una transición animada (ver `App.tsx`).
- **Expo cambió bastante entre versiones**: antes de tocar código, mirá la doc
  versionada en https://docs.expo.dev/versions/v56.0.0/ (ver `AGENTS.md`).
- La **prueba de vida (liveness) con ML Kit no corre en Expo Go**: necesitás un
  *dev build* (`expo run:android`). En Expo Go el flujo de identidad degrada a
  las capas que sí funcionan sin módulos nativos.
