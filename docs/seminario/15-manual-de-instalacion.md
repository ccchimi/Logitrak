# 15. Manual de instalación del software

Guía para instalar Logitrak desde cero: en una computadora para desarrollar o probar, y en los servicios donde corre en producción. Reúne en un solo lugar lo que está repartido en el [README](../../README.md), el [README del backend](../../backend/README.md) y la [guía de la app móvil](../mobile/README.md), que siguen siendo la referencia detallada de cada parte.

## 15.1 Qué se instala

| Parte | Tecnología | Dónde corre en producción |
|---|---|---|
| API (`backend/`) | Node.js 22 + Express | Render (`https://logitrak.onrender.com`) |
| Base de datos | PostgreSQL | Supabase |
| Archivos y tiempo real | Supabase Storage y Realtime | Supabase |
| Web App (`frontend/`) | Expo + React Native Web | GitHub Pages (`https://ccchimi.github.io/Logitrak/`) |
| App móvil (`frontend/`) | Expo + React Native (Android, iOS) | Builds de EAS |

## 15.2 Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22.13.0 o superior (lo pide Expo SDK 58) | Backend y app |
| npm y Git | Las que trae Node / cualquiera reciente | Dependencias y código |
| Docker Desktop | Cualquiera reciente | Base PostgreSQL local para desarrollo y pruebas (opcional si ya hay una base de desarrollo) |
| Android Studio + JDK | Compatible con Expo SDK 58 | Solo para compilar la app Android en la computadora |
| macOS + Xcode | Compatible con Expo SDK 58 | Solo para compilar la app iOS en la computadora |
| Cuenta de Expo | Con acceso al proyecto | Solo para compilar en EAS |

## 15.3 Instalación local paso a paso

### Paso 1. Obtener el código

```bash
git clone https://github.com/ccchimi/Logitrak.git
cd Logitrak
```

### Paso 2. Base de datos local

Para desarrollar sin tocar datos reales, levantá un PostgreSQL descartable:

```bash
docker run -d --name logitrak-pg-local -e POSTGRES_PASSWORD=local -p 55432:5432 postgres:17
```

> **Importante:** nunca apuntes una instalación de desarrollo ni las pruebas a la base de producción. El backend aplica migraciones al arrancar.

### Paso 3. Backend

```bash
cd backend
npm ci
cp .env.example .env
```

Editá `backend/.env` con lo mínimo para arrancar:

| Variable | Valor de ejemplo para local |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:local@localhost:55432/postgres` |
| `PGSSL` | `false` (la base local no usa SSL) |
| `JWT_SECRET` | Un texto largo y aleatorio, propio |
| `ADMIN_INICIAL_USUARIO` y `ADMIN_INICIAL_CONTRASENA` | Crean el primer administrador si no hay ninguno. La contraseña necesita 12 caracteres o más y no puede contener el usuario |

Las integraciones (Mercado Pago, MODO, Supabase, Google, Sentry) son opcionales: si faltan, la API funciona en modo de prueba y `GET /api/salud` muestra cada una como `no_configurado`. La tabla completa de variables está en la sección *Configuración* del [README](../../README.md#configuración).

Arrancá la API:

```bash
npm run dev
```

Al arrancar aplica las migraciones pendientes, crea el admin inicial si corresponde e inicia los trabajos en segundo plano. Queda escuchando en `http://localhost:4000`.

### Paso 4. Web App

En otra terminal:

```bash
cd frontend
npm ci
cp .env.example .env
```

En `frontend/.env`, apuntá la app a tu API local:

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Y arrancala en el navegador:

```bash
npm run web
```

Para usar una API del equipo en lugar de la local, poné su dirección en `EXPO_PUBLIC_API_URL`. Reiniciá Expo cada vez que cambies el `.env`.

### Paso 5. App móvil (opcional)

| Opción | Comando (desde `frontend/`) | Sirve para | Limitaciones |
|---|---|---|---|
| Expo Go en el teléfono | `npx expo start --go` y escanear el QR | Probar rápido, también en iPhone | No hay push ni prueba de vida. El teléfono tiene que alcanzar la API: con una API local usá la IP de la computadora, no `localhost` |
| Build local de Android | `npm run android` | Todas las funciones nativas | Requiere Android Studio |
| Build en EAS | `npx eas-cli build --platform android --profile preview` | Un APK para instalar y compartir | Requiere la cuenta de Expo del equipo y sus credenciales |

Detalles, perfiles de EAS e iOS: [guía de la app móvil](../mobile/README.md).

### Paso 6. Verificar la instalación

1. Abrí `http://localhost:4000/api/salud`: tiene que responder `"estado":"ok"`, la base `conectada` y `migracionesPendientes: 0`.
2. En la Web App, registrá un cliente, iniciá sesión y cotizá un envío con Boxy.
3. Entrá con el admin inicial y abrí "Todos los usuarios".
4. Opcional: corré las pruebas (sección 15.5).

## 15.4 Instalación en producción

### API en Render

| Configuración | Valor |
|---|---|
| Repositorio y rama | `ccchimi/Logitrak`, rama `main`, despliegue automático en cada push |
| Directorio raíz | `backend` |
| Build | `npm install` |
| Inicio | `npm start` |
| Variables | Las de la sección *Configuración* del README. Obligatorias: `DATABASE_URL`, `JWT_SECRET`. Recomendadas: Supabase, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, `GOOGLE_DIRECTIONS_KEY`, `SENTRY_DSN` |
| Health check | `/api/salud/vivo` (pendiente de configurar, #16) |

Después de cada despliegue, `GET https://logitrak.onrender.com/api/salud` muestra en `version` el commit que está corriendo.

### Base, Storage y Realtime en Supabase

1. Crear el proyecto y copiar la cadena de conexión a `DATABASE_URL` de Render (el esquema lo crean las migraciones al arrancar la API).
2. Crear el bucket de Storage **privado** y cargar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_BUCKET`.
3. Para Realtime, cargar `SUPABASE_ANON_KEY` y `SUPABASE_JWT_SECRET`. Las políticas RLS las crean las migraciones.

### Web App en GitHub Pages

El workflow [`web.yml`](../../.github/workflows/web.yml) exporta la app y la publica en cada push a `main` que cambie el frontend. Las variables públicas (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY`, `EXPO_PUBLIC_SENTRY_DSN`) se cargan en *Settings → Secrets and variables → Actions* del repositorio.

### App móvil con EAS

Con `npx eas-cli build --platform android --profile production` se genera el AAB para Google Play. Las variables del build se cargan en EAS: no se heredan de Render ni de GitHub. Para iOS hace falta la cuenta de Apple Developer y las credenciales de APNs (pendiente #4).

### Mercado Pago

En el panel de desarrolladores, configurar el webhook a `https://logitrak.onrender.com/api/pagos/webhook/mercadopago` con el evento de pagos y copiar su clave secreta a `MP_WEBHOOK_SECRET`.

## 15.5 Pruebas después de instalar

```bash
# Backend, contra una base descartable (nunca la de producción)
docker run -d --name logitrak-pg-prueba -e POSTGRES_PASSWORD=prueba -p 55433:5432 postgres:17
cd backend
TEST_DATABASE_URL=postgresql://postgres:prueba@localhost:55433/postgres PGSSL=false npm test

# App
cd frontend
npm run typecheck
npm test
```

Resultado esperado al 27/11/2026: 401 pruebas del backend y 319 de la app, todas en verde. La CI de GitHub Actions corre lo mismo en cada push a `main`.

## 15.6 Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| La API no arranca: "Falta DATABASE_URL" o "Falta JWT_SECRET" | Variables obligatorias sin cargar | Completar `backend/.env` |
| Error de SSL al conectar a una base local | La base local no usa SSL | `PGSSL=false` |
| La app muestra "No pudimos conectar con el servidor" | `EXPO_PUBLIC_API_URL` mal configurada, o la API de Render está despertando | Revisar el `.env` y reiniciar Expo; en Render, esperar unos segundos y reintentar |
| En el teléfono la app no llega a la API local | `localhost` en el teléfono es el propio teléfono | Usar la IP de la computadora en la red (por ejemplo `http://192.168.0.10:4000`) |
| El iPhone dice que el QR no tiene "datos utilizables" | El QR es para el build de desarrollo | Usar `npx expo start --go` |
| El mapa no traza la ruta por calle | Falta `GOOGLE_DIRECTIONS_KEY` en la API | Cargar la clave en Render (pendiente #20) |
| Las pruebas del backend se saltean | Falta `TEST_DATABASE_URL` | Levantar la base descartable y definir la variable |
| Pruebas que fallan al repetirlas sobre la misma base | La base acumula datos de corridas anteriores | Recrear el contenedor antes de correr la suite completa |
