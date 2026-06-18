# LogiTrack — Backend

API en Node.js + Express sobre PostgreSQL. Maneja autenticación con roles
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
| `asignaciones`   | Ofertas de viaje a choferes y su ciclo (ofrecida/aceptada/…).            |
| `cupones`        | Cupones de compensación emitidos al exceder el SLA.                      |

## Requisitos

- Node.js 20+
- PostgreSQL corriendo en `localhost:5432` (instalado como servicio de Windows)

## Cómo correrlo

```bash
cd backend
npm install
npm run dev      # con recarga automática (o: npm start)
```

Al arrancar, el servidor crea la base `logitrak` si no existe, aplica el
esquema (`src/db/schema.sql`) y siembra los 3 administradores y la flota. La API
queda en `http://localhost:4000`.

## Migrar la base a Azure (PostgreSQL Flexible Server)

El backend funciona igual contra Postgres local o Azure: solo cambian las
variables de entorno. Azure exige TLS, que se activa con `PGSSLMODE=require`.

**1. Crear el servidor** (por CLI; o el equivalente en el portal de Azure):

```bash
az postgres flexible-server create \
  --name logitrak-db \
  --resource-group <tu-grupo> \
  --location brazilsouth \
  --admin-user logitrakadmin \
  --admin-password '<password-fuerte>' \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --public-access <tu-IP-publica>
```

> No hay región en Argentina; `brazilsouth` es la más cercana (~30–50 ms).
> `--public-access <tu-IP>` abre el firewall a tu IP. Desde el portal:
> *Networking → Firewall rules → Add current client IP*.

**2. (Opcional) Crear la base** — el backend la crea solo al arrancar, pero
también podés hacerlo a mano:

```bash
az postgres flexible-server db create \
  --resource-group <tu-grupo> --server-name logitrak-db --database-name logitrak
```

**3. Apuntar el `.env`** a Azure (ver la "Opción B" en `.env.example`):

```ini
PGHOST=logitrak-db.postgres.database.azure.com
PGPORT=5432
PGUSER=logitrakadmin
PGPASSWORD=<password-fuerte>
PGDATABASE=logitrak
PGSSLMODE=require
```

**4. Inicializar y arrancar:**

```bash
npm run db:init   # aplica el esquema y siembra admins + flota en Azure
npm run dev
```

No hace falta migrar datos: el esquema y los seeds (admins + flota) se crean
solos en el primer arranque. Si más adelante tenés datos productivos, usá
`pg_dump`/`pg_restore`.

> **Si ves un error de certificado** al conectar, poné `PGSSL_INSECURE=true` en
> el `.env` para destrabar (salta la verificación del CA; OK en desarrollo).

## Conexión desde IntelliJ (Database tool)

Database → `+` → Data Source → PostgreSQL:

| Campo    | Valor       |
|----------|-------------|
| Host     | `localhost` |
| Port     | `5432`      |
| User     | `postgres`  |
| Password | `logitrack` |
| Database | `logitrak`  |

URL JDBC: `jdbc:postgresql://localhost:5432/logitrak`

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
| POST   | `/api/cotizaciones`               | Guarda una cotización emitida por Boxy               |
| GET    | `/api/cotizaciones`               | Lista cotizaciones del usuario (admin: todas)        |
| POST   | `/api/envios`                     | Confirma una cotización y crea el envío              |
| GET    | `/api/envios`                     | Lista envíos según rol (`?estado=` opcional)         |
| GET    | `/api/envios/metricas`            | KPIs del panel (total, en viaje, entregados, …)      |
| GET    | `/api/envios/:codigo`             | Detalle del envío + línea de tiempo de seguimiento   |
| POST   | `/api/envios/:codigo/eventos`     | Agrega evento de seguimiento y transiciona el estado |
| POST   | `/api/asignaciones`               | Registra una oferta de viaje para el chofer          |
| POST   | `/api/asignaciones/:codigo/aceptar`   | El chofer acepta la oferta                        |
| POST   | `/api/asignaciones/:codigo/rechazar`  | El chofer rechaza la oferta                       |
| POST   | `/api/asignaciones/:codigo/completar` | Cierra el viaje del chofer                        |
| GET    | `/api/asignaciones`               | Historial de asignaciones del chofer                 |
| GET    | `/api/cupones`                    | Cupones de compensación del cliente                  |
| POST   | `/api/cupones`                    | Emite un cupón (p. ej. por SLA excedido)             |
| POST   | `/api/pagos/checkout`             | Inicia el pago por QR/deeplink (Mercado Pago o MODO) |
| POST   | `/api/pagos/tarjeta`              | Cobra con tarjeta déb/créd (procesador simulado)     |
| POST   | `/api/pagos/:codigo/confirmar`    | Confirma un pago sandbox ("ya pagué")                |
| GET    | `/api/pagos/:codigo`              | Estado del pago (polling del checkout)               |
| GET    | `/api/pagos`                      | Pagos del cliente (`?envio=` opcional; admin: todos) |
| POST   | `/api/pagos/webhook/mercadopago`  | Webhook de Mercado Pago (sin auth)                   |
| GET    | `/api/perfil/resumen`             | Resumen de la cuenta para la pantalla de Perfil      |

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