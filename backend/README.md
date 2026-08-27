# Logitrak — Backend

API en Node.js + Express sobre PostgreSQL (Supabase). Maneja autenticación con roles
(`admin`, `cliente`, `chofer`), postulación a chofer con verificación de
identidad, auditoría de accesos y **todo el circuito operativo**: cotizaciones,
envíos, seguimiento, asignaciones a choferes y cupones de compensación.

## Modelo de datos

El esquema (`src/db/schema.sql`) persiste el circuito completo:

| Tabla            | Qué guarda                                                               |
|------------------|--------------------------------------------------------------------------|
| `usuarios`       | Cuentas y roles (admin / cliente / chofer).                              |
| `choferes`       | Ficha del chofer + verificación de identidad.                            |
| `auditoria_accesos` | Cada intento de login (IP, user-agent, resultado).                   |
| `vehiculos`      | Catálogo de la flota (espeja la FLOTA del bot).                          |
| `cotizaciones`   | Cada cotización emitida por Boxy (snapshot completo en JSONB).           |
| `envios`         | Pedido confirmado: estado `pendiente → asignado → en_viaje → entregado`. |
| `envio_eventos`  | Línea de tiempo del seguimiento (un evento por hito).                    |
| `asignaciones`   | Viajes tomados por cada chofer y su ciclo (aceptada/completada/…).       |
| `cupones`        | Cupones de compensación emitidos al exceder el SLA.                      |

## Requisitos

- Node.js 20+
- Acceso al proyecto de **Supabase** del equipo (PostgreSQL gestionado). Todos
  comparten el mismo proyecto, así que comparten datos. Ver "Base de datos en
  Supabase".

## Cómo correrlo

```bash
cd backend
npm install
cp .env.example .env   # (Windows PowerShell: copy .env.example .env)
npm run dev            # con recarga automática (o: npm start)
```

**Antes del primer arranque, editá el `.env`** y pegá el `DATABASE_URL` del
proyecto de Supabase (ver abajo). Sin un `DATABASE_URL` válido, el arranque falla
al conectar. El archivo está en `.gitignore`, así que tus credenciales no se
commitean.

Al arrancar, el servidor aplica el esquema (`src/db/schema.sql`, idempotente) y
siembra los 3 administradores y la flota. La API queda en
`http://localhost:4000` (o el `PORT` que definas).

## Deploy en producción (Render)

El backend está deployado como **Web Service** en Render
(`https://logitrak.onrender.com`), con **auto-deploy** desde la rama `main`.

- **Build:** `npm install` · **Start:** `npm start`.
- Las variables **no** salen del `.env` (que no se versiona): se cargan en el
  panel del servicio → **Environment**. Ahí van `DATABASE_URL`, `JWT_SECRET`,
  `PUBLIC_API_URL` (la URL pública de Render) y las tres `SUPABASE_*` de Storage.
  **No** definas `PORT`: Render lo inyecta.
- Como el esquema se aplica al arrancar (idempotente), las columnas nuevas se
  migran solas en el próximo deploy.

> **Plan Free:** la instancia hace *spin down* por inactividad y el primer
> request puede demorar ~50 s, lo que puede afectar los webhooks de pago. Para
> producción real, un plan pago (always-on) lo resuelve.

## Base de datos en Supabase

El backend usa un único connection string (`DATABASE_URL`); todo el equipo apunta
al **mismo proyecto de Supabase**, así que comparten datos en tiempo real.

**1. Conseguir el connection string** (lo hace una persona; el resto lo reutiliza):

En el panel de Supabase → botón **Connect** → pestaña **Connection string** /
ORMs. Copiá el del **Session pooler** (soporta IPv4 y las conexiones persistentes
del backend) y reemplazá `[TU-PASSWORD]` por la contraseña de la base del proyecto:

```
postgresql://postgres.tu-ref:[TU-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

**2. Apuntar el `.env`:**

```ini
DATABASE_URL=postgresql://postgres.tu-ref:TU-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**3. Inicializar y arrancar:**

```bash
npm run db:init   # aplica el esquema y siembra admins + flota en Supabase
npm run dev
```

No hace falta migrar datos: el esquema y los seeds (admins + flota) se crean
solos en el primer arranque. El TLS va activo por defecto; si vieras un error de
certificado del pooler, ya queda destrabado (no se valida el CA salvo que pongas
`PGSSL_STRICT=true`). Si más adelante tenés datos productivos en otra base, usá
`pg_dump`/`pg_restore` (o el SQL Editor de Supabase) para volcarlos.

## Conexión desde un cliente de base de datos (IntelliJ / DBeaver / VS Code)

Usá los datos del connection string del Session pooler de Supabase:

| Campo    | Valor                                            |
|----------|--------------------------------------------------|
| Host     | `aws-0-<region>.pooler.supabase.com`             |
| Port     | `5432`                                           |
| User     | `postgres.tu-ref`                                |
| Password | la contraseña de la base del proyecto            |
| Database | `postgres`                                       |
| SSL/TLS  | requerido (`sslmode=require`)                    |

URL JDBC: `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`

## Endpoints

| Método | Ruta                              | Descripción                                          |
|--------|-----------------------------------|------------------------------------------------------|
| GET    | `/api/salud`                      | Estado del servidor y la base                        |
| POST   | `/api/auth/login`                 | Inicia sesión, devuelve token + rol                  |
| POST   | `/api/auth/registro`              | Crea una cuenta (siempre rol `cliente`)              |
| GET    | `/api/auth/existe/:usuario`       | Indica si existe un usuario                          |
| POST   | `/api/auth/recuperar`             | Restablece contraseña (no permitido para admins)     |
| GET    | `/api/auth/perfil`                | Datos del usuario logueado (requiere token)          |
| POST   | `/api/choferes/postulacion`       | Postula a un cliente como chofer (requiere token)    |
| GET    | `/api/choferes/:codigo/documentos` | Selfie + frente del DNI (URLs firmadas; solo admin)  |
| POST   | `/api/cotizaciones`               | Guarda una cotización emitida por Boxy               |
| GET    | `/api/cotizaciones`               | Lista cotizaciones del usuario (admin: todas)        |
| POST   | `/api/envios`                     | Confirma una cotización y crea el envío              |
| GET    | `/api/envios`                     | Lista envíos según rol (`?estado=` opcional)         |
| GET    | `/api/envios/metricas`            | KPIs del panel (total, en viaje, entregados, …)      |
| GET    | `/api/envios/:codigo`             | Detalle del envío + línea de tiempo de seguimiento   |
| POST   | `/api/envios/:codigo/eventos`     | Agrega evento de seguimiento y transiciona el estado |
| GET    | `/api/asignaciones/disponibles`   | Envíos pagados que el chofer puede tomar (marketplace) |
| POST   | `/api/asignaciones/:codigoEnvio/tomar` | El chofer toma un envío (asignación atómica)    |
| GET    | `/api/asignaciones/activa`        | Viaje en curso del chofer                            |
| POST   | `/api/asignaciones/:codigo/completar` | Cierra el viaje y marca el envío entregado       |
| GET    | `/api/asignaciones`               | Historial de asignaciones del chofer                 |
| GET    | `/api/vehiculos`                  | Catálogo de la flota (para elegir en la postulación) |
| GET    | `/api/cupones`                    | Cupones de compensación del cliente                  |
| POST   | `/api/cupones`                    | Emite un cupón (p. ej. por SLA excedido)             |
| POST   | `/api/pagos/checkout`             | Inicia el pago por QR/deeplink (Mercado Pago o MODO) |
| POST   | `/api/pagos/tarjeta`              | Cobra con tarjeta déb/créd (procesador simulado)     |
| POST   | `/api/pagos/:codigo/confirmar`    | Confirma un pago sandbox ("ya pagué")                |
| GET    | `/api/pagos/:codigo`              | Estado del pago (polling del checkout)               |
| GET    | `/api/pagos`                      | Pagos del cliente (`?envio=` opcional; admin: todos) |
| POST   | `/api/pagos/webhook/mercadopago`  | Webhook de Mercado Pago (sin auth)                   |
| GET    | `/api/perfil/resumen`             | Resumen de la cuenta para la pantalla de Perfil      |

## Asignación de envíos (marketplace)

El circuito replica el modelo de las apps de movilidad: **el envío se publica para
la flota y el primer chofer que lo toma se lo lleva**.

1. El cliente confirma y **paga** el envío (`estado_pago = 'pagado'`, sin chofer).
2. El envío aparece en `GET /api/asignaciones/disponibles` **solo para los choferes
   cuyo vehículo soporta la carga** (se comparan `peso_kg` y `bultos` contra el
   `max_kg` / `max_bultos` de la unidad declarada en la postulación).
3. El chofer lo toma con `POST /api/asignaciones/:codigoEnvio/tomar`.
4. El envío queda con el chofer real (`chofer_id`, `chofer_nombre`), pasa a
   `asignado` y se registra el evento en la línea de tiempo que ve el cliente.
5. El chofer avanza los estados (`chofer_en_camino` → `retirado`) y cierra con
   `completar`, que marca el envío como `entregado`.

**Concurrencia:** dos choferes pueden intentar tomar el mismo envío a la vez. La
toma se resuelve con un `UPDATE ... WHERE chofer_id IS NULL` **condicional y
atómico** dentro de una transacción: exactamente uno gana y el resto recibe `409`.
No hace falta bloqueo explícito ni cola externa.

## Roles

- **admin**: no se puede crear desde la app; se siembran 3 por sistema en `src/db/init.js`.
- **cliente**: todo el que se registra.
- **chofer**: un cliente que completó la postulación ("Trabajá con nosotros") y
  pasó la verificación de identidad. Recibe un ID público único (p. ej. `CH-7F3K9Q`),
  que es lo único que ve el cliente junto a su nombre completo.

## Verificación de identidad (alta de chofer)

RENAPER requiere convenio/SID, así que el alta verifica identidad **offline**, en
tres capas. Las dos avanzadas vienen **registradas pero sin exigir** por defecto,
para no romper Expo Go / web.

| Tier | Qué hace | Estado por defecto | Para exigirlo |
|------|----------|--------------------|---------------|
| 1 · PDF417 | Lee el código del dorso del DNI y lo cruza con los datos tipeados + guarda la selfie. | **Activo y obligatorio.** | — |
| 2 · Liveness | Gestos (sonrisa + giro) validados on-device con ML Kit. | Se registra (`liveness_ok`). | `LIVENESS_REQUERIDO=true` + **dev build** de la app (`expo run:android`); ML Kit no corre en Expo Go. |
| 3 · Match facial | Compara la selfie con la foto del frente del DNI (face-api). | Se registra el score (`face_match_score`); degrada solo si falta runtime. | `FACE_MATCH_REQUERIDO=true` + runtime y modelos (abajo). |

**Activar el match facial (Tier 3):**

1. Usar **Node LTS (20/22)** e instalar el runtime nativo: `npm install @tensorflow/tfjs-node`.
2. Descargar los pesos a `backend/models` (`ssdMobilenetv1`, `faceLandmark68Net`,
   `faceRecognitionNet`) desde https://github.com/vladmandic/face-api/tree/master/model
   (o setear `FACE_MODELS_DIR`).
3. `FACE_MATCH_REQUERIDO=true` en el `.env`.

Si el runtime o los modelos no están, el match se saltea (score nulo) y el alta
sigue funcionando: nunca bloquea por una dependencia ausente.

### Dónde se guardan las fotos

La selfie y la foto del frente del DNI se suben a **Supabase Storage**, en un
bucket **privado** (`verificacion-identidad` por defecto). En la base solo se
persiste la ruta interna del objeto (`selfie_path`, `dni_frente_path`); para
revisarlas, `GET /api/choferes/:codigo/documentos` (solo admin) devuelve **URLs
firmadas** temporales, así el bucket nunca queda expuesto.

Configuralo en el `.env` (y en Render → Environment):

| Variable | Qué es |
|----------|--------|
| `SUPABASE_URL` | URL base del proyecto, **sin** `/rest/v1` (p. ej. `https://tu-ref.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` (secreta, **solo backend**). |
| `SUPABASE_BUCKET` | Nombre del bucket privado (por defecto `verificacion-identidad`). |

Creá el bucket privado antes del primer uso. Si estas variables quedan vacías,
las imágenes caen al disco local: sirve en desarrollo, pero **en Render el disco
es efímero y se borrarían en cada deploy**, así que en producción son
obligatorias.

## Pagos / facturación

El envío se cobra una vez confirmado. **Mercado Pago y MODO son integraciones
reales** (delegan en la pasarela cuando hay credenciales); sin credenciales, el
checkout por QR cae a un modo sandbox que se aprueba desde la app. La **tarjeta
es siempre simulada**. Al aprobarse, se emite un **comprobante**
(`COMP-AAAA-NNNNNN`) y el envío pasa a `estado_pago = 'pagado'`.

| Método | Cómo funciona | Real con… |
|--------|---------------|-----------|
| **Mercado Pago** (Checkout Pro) | SDK oficial `mercadopago`: crea una preferencia real, devuelve el `init_point` + QR y confirma por webhook/polling. El QR es interoperable, así que **MODO también puede escanearlo**. | `MP_ACCESS_TOKEN` + `PUBLIC_API_URL` (webhook). |
| **MODO** (e-commerce QR) | Auth + creación de intención de pago contra la API de MODO; confirma por webhook/polling. | `MODO_API_URL` + `MODO_CLIENT_ID` + `MODO_CLIENT_SECRET`. |
| **Tarjeta** déb/créd | Procesador **simulado**: valida Luhn, marca, vencimiento y CVV; guarda solo marca + últimos 4, **nunca el PAN**. | — (siempre simulado). |

> **Por qué la tarjeta es simulada:** cobrar tarjetas reales exige certificación
> PCI-DSS y un adquirente, fuera del alcance del proyecto. Para producción se
> reemplaza `servicios/pagos/tarjeta.js` por un gateway que tokenice la tarjeta
> en el cliente, sin que el número toque nunca este backend.
>
> En sandbox, una tarjeta con número válido (Luhn) se **aprueba**; el PAN de
> prueba `4000 0000 0000 0002` se **rechaza** para demostrar el camino de error.
> Transferencias bancarias: **no soportadas** a propósito.

**Activar Mercado Pago real:** poné el `MP_ACCESS_TOKEN`, exponé el backend con
ngrok y seteá `PUBLIC_API_URL` para que MP pueda llamar al webhook.

**Activar MODO real:** completá `MODO_API_URL` + `MODO_CLIENT_ID` +
`MODO_CLIENT_SECRET`. Como la documentación de MODO está detrás de login, en
`src/servicios/pagos/modo.js` los endpoints y nombres de campo están marcados
con `[DOC]`: confirmá cada uno contra tu doc de MODO (o fijalos por env:
`MODO_TOKEN_URL`, `MODO_INTENTION_URL`, `MODO_STATUS_URL`, `MODO_STORE_ID`).

## Seguridad implementada

- Contraseñas hasheadas con bcrypt (nunca en texto plano).
- Sesiones con JWT firmado (expiración configurable, `JWT_EXPIRA`).
- Rate limiting en login/recuperación (10 intentos por IP cada 15 min).
- Auditoría de todos los intentos de acceso en `auditoria_accesos` (IP, user-agent, resultado).
- Las cuentas admin no se registran ni se restablecen desde la app.
- Consultas SQL siempre parametrizadas (sin concatenación de strings).
- Alta de chofer transaccional (rol + ficha cambian juntos o no cambia nada).
