# Logitrak · Backend

API REST en Node.js con Express, montada sobre PostgreSQL. Resuelve la
autenticación con roles, el alta de choferes con verificación de identidad, la
auditoría de accesos y todo el circuito operativo: cotizaciones, envíos,
seguimiento, asignación a choferes, pagos y cupones de compensación.

## Modelo de datos

El esquema se maneja con migraciones versionadas (`node-pg-migrate`), en
`migrations/`. Al arrancar, la API aplica las pendientes y después siembra los
datos base (admins y flota); cada migración corre una sola vez y queda
registrada en la tabla `pgmigrations`. Ver [Migraciones](#migraciones).

Las cuentas y sus roles viven en `usuarios`, y cuando alguien se convierte en
chofer se le crea además una ficha en `choferes` con su verificación de identidad
y el vehículo que declaró. Cada intento de login queda registrado en
`auditoria_accesos`. La flota disponible está en `vehiculos`, que es la que
determina qué envíos puede tomar cada chofer.

Del lado operativo, `cotizaciones` guarda cada presupuesto que emite Boxy con su
snapshot completo en JSONB, y cuando el cliente confirma se crea el `envio`, que
avanza por los estados `pendiente`, `asignado`, `en_viaje` y `entregado`. Cada
hito de ese recorrido queda como una fila en `envio_eventos`, que es lo que
alimenta la línea de tiempo del seguimiento. Los viajes que toma cada chofer se
registran en `asignaciones`, los cobros en `pagos` y las compensaciones por SLA
incumplido en `cupones`.

## Requisitos

Node.js 20 o superior y acceso al proyecto de Supabase del equipo, que es donde
corre el PostgreSQL. Como todos apuntamos al mismo proyecto, compartimos los
datos en tiempo real.

## Cómo correrlo

```bash
cd backend
npm install
cp .env.example .env   # en PowerShell: copy .env.example .env
npm run dev            # con recarga automática (o npm start)
```

Antes del primer arranque hay que editar el `.env` y pegar el `DATABASE_URL`,
porque sin una conexión válida el servidor falla al iniciar. Ese archivo está en
`.gitignore`, así que las credenciales no se versionan.

Al arrancar, el servidor aplica el esquema y siembra los tres administradores y
la flota. La API queda escuchando en `http://localhost:4000`, o en el puerto que
definas con `PORT`.

## Conexión a la base

El backend usa un único connection string. Para obtenerlo hay que entrar al panel
de Supabase, ir a **Connect** y copiar el de **Session pooler** en formato URI,
que es el que conviene porque soporta IPv4 y las conexiones persistentes que
mantiene el pool de `pg`. El usuario tiene la forma `postgres.<ref-del-proyecto>`,
y hay que reemplazar el marcador de la contraseña por la de la base:

```ini
DATABASE_URL=postgresql://postgres.turef:TU-PASSWORD@aws-1-<region>.pooler.supabase.com:5432/postgres
```

Con eso alcanza para inicializar y levantar:

```bash
npm run db:init   # aplica las migraciones y siembra admins y flota
npm run dev
```

El TLS va activo por defecto, que es lo que Supabase exige. Si alguna vez
aparece un error de certificado del pooler no hace falta tocar nada, porque no
validamos la cadena salvo que definas `PGSSL_STRICT=true`.

Si querés conectarte desde un cliente como DBeaver o IntelliJ, los datos salen
del mismo connection string: el host es el del pooler, el puerto 5432, la base
`postgres` y el SSL es obligatorio (`sslmode=require`).

## Entornos y configuración

El backend distingue tres entornos con la variable `ENTORNO`: `desarrollo`,
`staging` y `produccion`. Si no está definida, en Render es `produccion` y en
cualquier otro lado `desarrollo`. Al arrancar se carga `backend/.env.<entorno>`
y después `backend/.env`; ninguno pisa lo que ya viene del entorno real (el
panel de Render o la línea de comandos), así que el orden de prioridad es:
entorno real, archivo del entorno, `.env` común.

```bash
ENTORNO=staging npm start   # usa backend/.env.staging + backend/.env
```

`backend/.env.staging.example` y `backend/.env.produccion.example` listan qué va
en cada uno; los archivos reales están en el `.gitignore`. Staging tiene que
tener base, `JWT_SECRET` y credenciales propias, nunca las de producción.
`staging` y `produccion` cuentan como despliegues: nunca guardan fotos en disco y
la migración base no se puede revertir.

Antes de tocar la base, la API revisa la configuración
(`src/config/entorno.js`). Sin `DATABASE_URL` o `JWT_SECRET` no arranca. Lo
recomendado que falte (Storage, Directions, Sentry, el secreto del webhook,
credenciales de prueba de Mercado Pago en producción, un `JWT_SECRET` corto)
queda como aviso en el log al arrancar.

## Salud

| Ruta | Qué revisa | Status |
|---|---|---|
| `GET /api/salud/vivo` | Que el proceso responda (no toca la base) | 200 |
| `GET /api/salud` | Base, migraciones y servicios externos | 200, o 503 si la base no responde |

`/api/salud` devuelve el estado general (`ok`, `degradado` o `error`) y el de
cada componente:

```json
{ "exito": true, "estado": "degradado", "baseDeDatos": "conectada",
  "entorno": "produccion", "version": "6e7430e", "activoDesdeSeg": 5,
  "componentes": {
    "baseDeDatos": { "estado": "ok", "latenciaMs": 9, "migracionesPendientes": 0 },
    "mercadoPago": { "estado": "ok" },
    "almacenamiento": { "estado": "no_configurado" },
    "googleDirections": { "estado": "configurado" },
    "modo": { "estado": "no_configurado" },
    "sentry": { "estado": "no_configurado" } },
  "avisosDeConfiguracion": 2 }
```

- **Base de datos**: `SELECT 1` con un límite de 3 segundos, la latencia y las
  migraciones del repo que todavía no se aplicaron. Si no responde, el estado es
  `error` y la ruta devuelve 503.
- **Mercado Pago** (`GET /users/me` con el access token) y **Storage** (el
  bucket existe y sigue siendo privado) se consultan de verdad, pero el
  resultado se guarda un minuto: el endpoint es público y no tiene que servir
  para gastar APIs de terceros. Si fallan, el estado es `degradado` y la ruta
  sigue en 200, porque el resto de la API funciona.
- **Directions, MODO y Sentry** solo informan si están configurados: consultar
  Directions cuesta cuota.

La respuesta nunca incluye el motivo de un error (va al log) y `version` es el
commit desplegado, útil para confirmar qué versión está corriendo. Como health
check de Render conviene `/api/salud/vivo`: si Supabase tiene un corte, no tiene
sentido que Render reinicie la API.

## Trabajos en segundo plano

Lo que tiene que pasar aunque nadie esté mirando la app corre con `pg-boss`
(`src/trabajos/`), sobre la misma base PostgreSQL: pg-boss crea y mantiene su
propio schema `pgboss` y usa el pool de la API, sin conexiones aparte. Los
workers corren dentro del proceso de la API (en Render Free hay una sola
instancia).

| Cola | Qué hace | Cuándo |
|---|---|---|
| `barrer-ofertas-vencidas` | Busca envíos pagos que ningún chofer tomó a tiempo y encola uno por envío | Cada minuto y al arrancar |
| `expirar-oferta` | Cancela el envío y devuelve el pago | Por envío, con reintentos |
| `barrer-sla` | Busca envíos pagos con el SLA vencido sin entrega, o entregados tarde | Cada minuto y al arrancar |
| `revisar-sla` | Acredita un cupón de compensación y registra el evento `sla_excedido` | Por envío, con reintentos |
| `barrer-impagos` | Busca pedidos que no se pagaron dentro de `MINUTOS_PARA_PAGAR` (5) | Cada minuto y al arrancar |
| `eliminar-impago` | Borra el pedido de la base, con sus intentos de pago y eventos | Por envío, con reintentos |

**Pedidos sin pagar.** Cada envío nace con `pago_vence_en` (5 minutos). Pasado
ese límite el checkout, la tarjeta y la confirmación sandbox responden 409 con
`codigo: 'pedido_vencido'`, y la preferencia de Mercado Pago vence a la misma
hora. Un minuto después, el trabajo borra el pedido: en cascada se van sus
eventos y sus intentos de pago, la cotización queda `vencida` y el cliente
recibe una notificación. Antes de borrar se le pregunta a la pasarela por los
intentos reales pendientes: si figura un pago aprobado o en proceso, el pedido
no se borra; si la pasarela no responde, se reintenta.

Cada trabajo por envío se reintenta hasta 6 veces con espera creciente (de 30
segundos a 15 minutos): un reembolso que la pasarela rechaza por un rato no
frena al resto. Si agota los reintentos, queda como fallido en pg-boss y va al
log y a Sentry. Las colas usan la política `exclusive`, así que no puede haber
dos trabajos pendientes para el mismo envío ni dos barridos a la vez. Al
arrancar se barre enseguida: Render Free duerme el servicio y al despertar no
esperamos al próximo minuto. El estado de los trabajos aparece en `/api/salud`.

Listar y tomar ofertas ya excluyen las vencidas por su cuenta, así que entre que
una oferta vence y el trabajo la cancela ningún chofer puede tomarla.

**SLA y cupones.** El plazo (`MINUTOS_SLA`, 20 minutos) lo fija el servidor y
empieza a correr cuando se aprueba el pago; el `slaMin` que manda la app se
ignora. Si el envío no se entregó a tiempo, el trabajo acredita un único cupón
de `DESCUENTO_SLA_PCT` (15 %) y marca `sla_revisado_en`. Los envíos cancelados
no reciben cupón: se les devuelve el pago. Antes el cupón lo pedía la app y
`POST /api/cupones` aceptaba el porcentaje que mandara el cliente; ahora esa
ruta emite cupones a mano solo para un admin, y para un cliente funciona como
"revisá el SLA de mi envío" (así las versiones viejas de la app no se rompen).

## Eventos y notificaciones (outbox)

Lo que un hecho de negocio tiene que disparar afuera de su transacción (avisarle
al cliente, y más adelante un push o un mail) pasa por el patrón outbox
(`src/outbox/`):

1. La transacción que produce el hecho inserta una fila en `outbox_events` con
   `registrarEvento(cliente, …)`. Si la transacción se revierte, el evento no
   existe; si se confirma, queda garantizado aunque el proceso se caiga justo
   después. Desde adentro de la transacción nunca se llama a un tercero.
2. El trabajo `despachar-outbox` (pg-boss) toma los pendientes y ejecuta el
   manejador de cada tipo. Cada evento se procesa en su propia transacción con
   `FOR UPDATE SKIP LOCKED`, junto con la marca `processed`: los efectos en la
   base quedan una sola vez aunque el evento se reprocese.
3. Si un manejador falla, el evento se reintenta con espera creciente (30 s,
   1 min, 2 min…); al octavo intento queda con `failed_at` y va al log y a
   Sentry. Los procesados se borran a los 30 días.

El despachador corre cada minuto y, además, 2 segundos después de cada evento
registrado: un pago aprobado se notifica en unos 3 segundos.

| Evento | Lo produce | Efecto |
|---|---|---|
| `pago.aprobado` | Aprobación del pago (tarjeta, webhook, consulta, sandbox) | Notificación al cliente con monto y comprobante |
| `pago.duplicado` | Un segundo pago aprobado sobre el mismo envío | Notificación a los admins para devolverlo |
| `envio.cancelado_sin_chofer` | Trabajo de expiración de ofertas | Notificación al cliente con el estado de la devolución |
| `cupon.acreditado` | Trabajo de revisión del SLA | Notificación al cliente con el cupón |

Los payloads llevan ids, códigos y montos, nunca nombres ni direcciones. Las
notificaciones (`notificaciones`) son la bandeja de cada usuario en la app y se
borran al eliminar la cuenta. No hay mail: el modelo no guarda el email de los
clientes. El push a los teléfonos (Hito 2.3) se suma como otro manejador.

## Tiempo real y push

**Seguimiento en tiempo real.** La pantalla de seguimiento escucha por Supabase
Realtime los cambios de su envío (`envios`) y sus eventos nuevos
(`envio_eventos`), con el mismo token que el chat de soporte (lo firma el
backend en `GET /api/soporte/realtime`). El aviso no trae datos: dispara una
consulta a la API. Con Realtime conectado, la consulta queda como respaldo cada
60 segundos; sin Realtime, cada 10 (antes era cada 5). Las políticas de solo
lectura dejan escuchar al cliente sus envíos, al chofer los que tiene asignados
y al admin todos. Realtime se activa solo si están `SUPABASE_URL`,
`SUPABASE_ANON_KEY` y `SUPABASE_JWT_SECRET`.

**RLS en todas las tablas.** La app recibe la anon key de Supabase para
conectarse a Realtime, y con esa clave la API REST de Supabase expone cualquier
tabla del schema `public` sin RLS. Por eso todas las tablas tienen RLS activo:
sin políticas, quien entre con la anon key o con el token de Realtime no lee
nada, salvo lo que habilitan las políticas de solo lectura de soporte y
seguimiento. El backend no se ve afectado porque es el dueño de las tablas. Una
prueba de integración verifica que no quede ninguna tabla sin RLS: toda tabla
nueva tiene que activarlo en su migración.

**Push.** La app registra el token de Expo del teléfono al iniciar sesión y lo
da de baja al cerrarla (hasta 5 teléfonos por usuario). Cada notificación nueva
del outbox sale también como push, y cuando se aprueba un pago, los choferes
cuyo vehículo puede llevar el envío reciben "Nuevo envío disponible". Cuando un
chofer toma un envío, el cliente recibe "Chofer asignado". El push se manda con
`expo-server-sdk` después de confirmar la transacción del evento; si falla,
queda en el log y la notificación igual está en la bandeja. Los tokens que Expo
reporta como `DeviceNotRegistered` se borran. `EXPO_ACCESS_TOKEN` hace falta solo
si en expo.dev está activa la seguridad reforzada de push.

## Migraciones

Cada cambio de esquema es un archivo nuevo en `migrations/`, con su `up` y su
`down`. Nunca se edita una migración ya desplegada: se agrega otra.

```bash
npm run migrar:crear -- agregar-telefono-cliente   # crea migrations/<timestamp>_agregar-telefono-cliente.js
npm run migrar                                     # aplica las pendientes
npm run migrar -- estado                           # lista aplicadas y pendientes
npm run migrar -- down                             # revierte la última (down 3: las últimas 3)
```

Dentro de la migración se puede usar la API de `pgm` (`pgm.addColumn`,
`pgm.createIndex`, etc.) o SQL directo con `pgm.sql(...)`. Todas las pendientes
corren en una sola transacción: si una falla, no queda ninguna a medias y la API
no arranca, que es preferible a correr con un esquema inconsistente.

La primera, `1794520000000_esquema-inicial`, contiene el esquema completo que
había antes de adoptar migraciones (`src/db/sql/esquema-inicial.sql`). Es
idempotente, así que en una base vacía crea todo y en la de producción, que ya
lo tenía, no cambia nada: solo queda registrada. Su `down` borra todas las
tablas y por eso se niega a correr en producción (`RENDER=true` o
`NODE_ENV=production`).

El runner toma un advisory lock de PostgreSQL y, si otra instancia está
migrando, espera. Por eso `DATABASE_URL` tiene que usar el pooler de Supabase en
modo sesión (puerto 5432), no el de transacciones (6543), donde los locks de
sesión no funcionan.

## Despliegue

El backend corre en Render como Web Service, con despliegue automático desde
`main`. Instala con `npm install` y arranca con `npm start`.

Las variables no salen del `.env`, que no se versiona, sino que se cargan en el
panel del servicio, en la sección Environment: van ahí `DATABASE_URL`,
`JWT_SECRET`, `PUBLIC_API_URL` con la URL pública, y las tres variables de
Supabase Storage. Lo que no hay que definir es `PORT`, porque Render lo inyecta
solo y fijarlo hace que el servicio no exponga el puerto correcto.

Conviene tener presente que el plan gratuito apaga la instancia cuando no recibe
tráfico, y el primer pedido después de ese apagado puede tardar unos cincuenta
segundos. Eso afecta sobre todo a los webhooks de pago, así que para producción
haría falta un plan que mantenga el servicio activo.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/salud` | Estado del servidor y la base |
| POST | `/api/auth/login` | Inicia sesión y devuelve token y rol |
| POST | `/api/auth/registro` | Crea una cuenta, siempre con rol `cliente` |
| GET | `/api/auth/existe/:usuario` | Indica si un usuario ya está tomado |
| POST | `/api/auth/recuperar` | Restablece contraseña (no aplica a admins) |
| GET | `/api/auth/perfil` | Datos del usuario autenticado |
| POST | `/api/choferes/postulacion` | Postula a un cliente como chofer |
| GET | `/api/choferes/:codigo/documentos` | Selfie y DNI con URLs firmadas (solo admin) |
| POST | `/api/cotizaciones` | Recalcula la cotización en el servidor y la guarda |
| GET | `/api/cotizaciones` | Cotizaciones del usuario (admin ve todas) |
| POST | `/api/envios` | Crea el envío a partir de una cotización vigente del cliente |
| GET | `/api/envios` | Envíos según rol, con `?estado=` opcional |
| GET | `/api/envios/metricas` | Totales para el panel |
| GET | `/api/envios/:codigo` | Detalle del envío y su línea de tiempo |
| POST | `/api/envios/:codigo/eventos` | Agrega un hito y transiciona el estado |
| GET | `/api/asignaciones/disponibles` | Envíos que el chofer puede tomar |
| POST | `/api/asignaciones/:codigoEnvio/tomar` | El chofer toma un envío |
| GET | `/api/asignaciones/activa` | Viaje en curso del chofer |
| POST | `/api/asignaciones/:codigo/completar` | Cierra el viaje y marca la entrega |
| GET | `/api/asignaciones` | Historial de viajes del chofer |
| GET | `/api/vehiculos` | Catálogo de la flota |
| GET | `/api/cupones` | Cupones del cliente |
| POST | `/api/cupones` | Emite un cupón por SLA incumplido |
| POST | `/api/pagos/checkout` | Inicia el pago por QR o deeplink |
| POST | `/api/pagos/tarjeta` | Cobra con tarjeta (procesador simulado) |
| POST | `/api/pagos/:codigo/confirmar` | Confirma un pago sandbox |
| GET | `/api/pagos/:codigo` | Estado del pago |
| GET | `/api/pagos` | Pagos del cliente (admin ve todos) |
| POST | `/api/pagos/webhook/mercadopago` | Webhook de Mercado Pago, sin auth |
| GET | `/api/perfil/resumen` | Resumen de cuenta para la pantalla de Perfil |
| GET | `/api/recorridos` | Ruta por calles entre dos puntos (Google Directions, con caché) |
| GET | `/api/notificaciones` | Bandeja del usuario (`?soloNoLeidas=true`, `?limite=`) y cantidad sin leer |
| POST | `/api/notificaciones/leidas` | Marca como leídas las indicadas en `ids`, o todas |
| POST | `/api/notificaciones/push-token` | Registra el teléfono (token de Expo) para recibir push |
| DELETE | `/api/notificaciones/push-token` | Da de baja el token del teléfono (al cerrar sesión) |
| POST | `/api/perfil/eliminar-cuenta` | Elimina la cuenta propia (pide la contraseña) |

## Cómo se calcula el precio

El precio lo decide el servidor. La app cotiza con Boxy para mostrar el
resultado al instante, pero `POST /api/cotizaciones` vuelve a calcularlo con los
datos de la carga (direcciones, peso, bultos, medidas, descripción) e ignora el
precio, el vehículo y la distancia que mande el cliente. Si no coinciden, la
respuesta trae `precioAjustado: true` y el cálculo del servidor, que es el que la
app pasa a mostrar.

Para que los dos lados den exactamente lo mismo, el backend no tiene una copia
escrita a mano del cotizador: `npm run generar:cotizador` empaqueta con esbuild
el de `frontend/src/services/botLogistica` en
`src/servicios/cotizador/cotizador.generado.js`. Ese archivo se commitea, así que
Render no necesita ningún paso de build, y la CI falla si alguien cambió el
cotizador sin regenerarlo. Las franjas horarias se calculan en hora argentina
aunque el servidor corra en UTC.

`POST /api/envios` ya no recibe precio: toma el precio, la carga, el vehículo y
la distancia de la cotización guardada, y la rechaza si es de otro cliente o si
venció (15 minutos). Lo que se cobra en `/api/pagos` es ese precio.

## Cómo se asignan los envíos

Elegimos el mismo modelo que usan las aplicaciones de movilidad: en vez de
decidir centralmente a qué chofer le toca cada viaje, publicamos el envío y deja
que la flota lo tome.

El recorrido arranca cuando el cliente paga. Recién ahí el envío queda con
`estado_pago = 'pagado'` y sin chofer, que es la condición para que aparezca en
`GET /api/asignaciones/disponibles`. Ese listado no es igual para todos: filtra
por capacidad, comparando el peso y los bultos del envío contra el `max_kg` y el
`max_bultos` del vehículo que el chofer declaró al postularse, de manera que una
moto nunca ve una mudanza.

Cuando un chofer lo toma, el envío queda asociado a su ficha, pasa a `asignado` y
se escribe el evento correspondiente en la línea de tiempo que ve el cliente. A
partir de ahí el chofer va marcando los hitos (`chofer_en_camino`, `retirado`) y
cierra con `completar`, que marca el envío como entregado.

El punto interesante es qué pasa si dos choferes tocan el botón al mismo tiempo.
Lo resolvemos con un `UPDATE` condicional sobre la fila del envío, que solo
modifica si `chofer_id IS NULL`, todo dentro de una transacción. Como PostgreSQL
serializa las escrituras sobre la misma fila, exactamente uno gana y el otro
recibe un `409` con el motivo. No necesitamos ni un bloqueo explícito ni una cola
externa para garantizarlo.

## Roles

Los administradores no se pueden crear desde la aplicación: se siembran tres por
sistema en `src/db/init.js`. Cualquiera que se registra queda como cliente. Y un
chofer es un cliente que completó la postulación de "Trabajá con nosotros",
declaró su vehículo y aprobó la verificación de identidad; al aprobarse recibe un
identificador público del estilo `CH-7F3K9Q`, que es lo que ve el cliente junto a
su nombre y su unidad.

## Verificación de identidad

Validar contra RENAPER requiere un convenio y credenciales SID que no están al
alcance del proyecto, así que resolvimos la verificación de forma offline y en
tres capas. Las dos más avanzadas quedan registradas pero no son obligatorias por
defecto, para que el alta siga funcionando en Expo Go y en web.

La primera capa lee el código PDF417 del dorso del DNI y lo cruza contra los
datos que la persona tipeó: si el número o el apellido no coinciden, el alta se
rechaza. Esta capa está activa y es obligatoria.

La segunda es la prueba de vida, que pide dos gestos y los valida en el
dispositivo con ML Kit. Se guarda el resultado en `liveness_ok`, pero para
exigirla hay que poner `LIVENESS_REQUERIDO=true` y usar un dev build de la
aplicación, porque ML Kit no corre en Expo Go.

La tercera compara la selfie con la foto del frente del DNI usando face-api y
guarda el puntaje en `face_match_score`. Para exigirla hace falta
`FACE_MATCH_REQUERIDO=true`, además de instalar el runtime nativo con
`npm install @tensorflow/tfjs-node` sobre Node LTS y descargar los pesos de los
modelos `ssdMobilenetv1`, `faceLandmark68Net` y `faceRecognitionNet` a
`backend/models`, o bien apuntar `FACE_MODELS_DIR` a donde los tengas. Si el
runtime o los modelos no están, el match se saltea con puntaje nulo y el alta
sigue adelante: preferimos que una dependencia ausente no bloquee el registro.

### Dónde quedan las fotos

La selfie y la foto del DNI se suben a Supabase Storage, en un bucket privado que
por defecto se llama `verificacion-identidad`. En la base guardamos únicamente la
ruta interna del objeto, en `selfie_path` y `dni_frente_path`, nunca la imagen ni
una URL pública. Para revisarlas está `GET /api/choferes/:codigo/documentos`,
que solo responde a un admin y devuelve URLs firmadas que vencen a los 5 minutos,
de manera que el bucket nunca queda expuesto. Los adjuntos del chat de soporte
usan el mismo bucket con URLs de 10 minutos. Antes de la primera subida, el servidor revisa que
el bucket sea privado y se niega a subir nada si alguien lo marcó como público.

La configuración va en el `.env` y en el panel de Render:

| Variable | Qué es |
|----------|--------|
| `SUPABASE_URL` | URL base del proyecto, sin `/rest/v1` (por ejemplo `https://turef.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role`, secreta y solo de servidor |
| `SUPABASE_BUCKET` | Nombre del bucket privado |

El bucket hay que crearlo antes del primer uso. Si estas variables quedan vacías
las imágenes caen al disco local, lo cual alcanza para desarrollo. En producción
(`RENDER=true` o `NODE_ENV=production`) nunca se escriben fotos de documentos en
disco: sin Storage, el alta sigue sin las fotos y queda registrado en el log.

## Pagos

El cobro sucede una vez que el envío está confirmado. El método principal es
Mercado Pago, que es una integración real y delega en la pasarela cuando hay
credenciales cargadas; si no las hay, el checkout por QR cae a un modo sandbox
que se aprueba desde la aplicación. Cuando el pago se aprueba emitimos un
comprobante con el formato `COMP-AAAA-NNNNNN` y el envío pasa a
`estado_pago = 'pagado'`, que es lo que lo habilita a publicarse para la flota.

Mercado Pago funciona con Checkout Pro a través del SDK oficial: creamos una
preferencia, devolvemos el `init_point` con su QR y confirmamos por webhook o por
consulta. Para activarlo hace falta `MP_ACCESS_TOKEN` y `PUBLIC_API_URL`
apuntando a una URL que Mercado Pago pueda alcanzar (en producción, la de Render).

El webhook tiene dos controles. Primero valida la **firma HMAC-SHA256** de
Mercado Pago (`x-signature` y `x-request-id`) con `MP_WEBHOOK_SECRET`: sin firma
válida responde 401, y si la clave no está configurada responde 503 y no procesa
nada. Después no confía en el contenido del aviso: toma solo el id firmado de la
URL y le vuelve a pedir el pago a Mercado Pago antes de aprobar. Si algo falla de
nuestro lado responde 500, para que Mercado Pago reintente.

**Idempotencia.** `POST /api/pagos/checkout` y `POST /api/pagos/tarjeta` aceptan
el encabezado opcional `Idempotency-Key` (un UUID, que la app genera en cada
intento): repetir el pedido con la misma clave devuelve el resultado original en
vez de cobrar de nuevo, y usarla para otro envío o método responde 422. Además,
cada pedido bloquea el envío dentro de una transacción, así que reintentos y
doble clic se serializan; un checkout pendiente y vigente (15 minutos) del mismo
envío y método se reutiliza en lugar de crear otro pago y otra preferencia, y si
la pasarela falla no queda ninguna fila huérfana. Aprobar también es
idempotente, y si un envío llegara a recibir un segundo cobro aprobado, ese pago
queda marcado como duplicado (`detalle.duplicadoDe`) para reembolsarlo.

Un punto importante para el alcance: como el QR de Mercado Pago es interoperable
bajo el estándar de Transferencias 3.0 del BCRA, un usuario de MODO puede escanear
ese mismo código y pagar desde su banco. Es decir, los usuarios de MODO ya quedan
cubiertos por el QR, sin necesitar una integración aparte.

La integración directa con MODO (deeplink nativo a su app) queda como trabajo a
futuro. Requiere un convenio de comercio con MODO para acceder a su API, que hoy
no tenemos, así que la sacamos de la selección de métodos de pago. El servicio
`servicios/pagos/modo.js` permanece en el código, apagado mientras no haya
credenciales, y todas sus URLs son configurables por variable de entorno
(`MODO_API_URL`, `MODO_CLIENT_ID`, `MODO_CLIENT_SECRET`, y opcionalmente
`MODO_TOKEN_URL`, `MODO_INTENTION_URL`, `MODO_STATUS_URL`, `MODO_STORE_ID`). El
día que exista el convenio, reactivarla es cuestión de configuración.

El pago con tarjeta, en cambio, es simulado siempre. El procesador valida el
número por el algoritmo de Luhn, la marca, el vencimiento y el CVV, y guarda
únicamente la marca y los últimos cuatro dígitos: el número completo nunca se
persiste. La razón es concreta: cobrar tarjetas de verdad exige certificación
PCI-DSS y un acuerdo con un adquirente, algo que excede el alcance del proyecto.
Para llevarlo a producción habría que reemplazar `servicios/pagos/tarjeta.js` por
un gateway que tokenice la tarjeta del lado del cliente, de forma que el número
no pase nunca por este backend. En el sandbox, cualquier número válido según
Luhn se aprueba, salvo el `4000 0000 0000 0002`, que rechazamos a propósito para
poder mostrar el camino de error. Las transferencias bancarias no están
soportadas, y es una decisión deliberada.

## Seguridad

**Sesiones** (`src/servicios/sesiones.js`): la app recibe un token de acceso
(JWT) de 15 minutos y un refresh token de 30 días. El refresh token es un valor
aleatorio del que en la base solo se guarda el SHA-256 (tabla `sesiones`).
`POST /api/auth/refresh` lo cambia por uno nuevo (rotación) junto con un token
de acceso fresco, releyendo el usuario de la base. Si un refresh token ya usado
vuelve a aparecer, se revoca toda su cadena, porque probablemente lo copiaron;
si aparece dentro de los 30 segundos de rotado, se responde 409 sin revocar
nada, porque suelen ser dos pestañas renovando a la vez. `POST /api/auth/logout`
revoca la sesión del dispositivo, y cambiar la contraseña cierra todas las de la
cuenta. Un token de acceso vencido responde 401 con `codigo: 'token_vencido'`, y
la app lo renueva sola y repite el pedido.

Compatibilidad: la app nueva se identifica con el encabezado
`X-Logitrak-Sesion: refresh`. Las versiones viejas no lo mandan y siguen
recibiendo el token de `JWT_EXPIRA` (8 h) sin refresh token, como antes; ese
camino se puede quitar cuando nadie las use.

**Validación de entradas** (`src/middleware/validar.js` y `src/esquemas/`): cada
ruta que recibe datos declara un esquema de Zod (auth, cotizaciones, envíos,
pagos y postulación de chofer). Si el pedido no lo cumple se corta antes de
tocar la base con un 400 estándar:

```json
{ "exito": false, "status": "fail", "error": "Ingresá un email válido.",
  "errors": [{ "campo": "email", "mensaje": "Ingresá un email válido." }] }
```

`error` repite el primer mensaje porque es el campo que muestra la app. Si el
pedido es válido, la ruta recibe los datos ya normalizados (recortados,
convertidos y sin campos desconocidos), así que los campos de más que mandan las
versiones viejas de la app se descartan sin error. Las reglas que dependen de la
base (usuario existente, DNI ya registrado, vehículo de la flota) siguen en cada
ruta.

**Seguridad HTTP** (`src/middleware/seguridad.js` y `limites.js`):

- **Cabeceras** con `helmet`: HSTS, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options`, política de recursos entre orígenes, sin `X-Powered-By`.
- **CORS acotado**: solo la Web App (`https://ccchimi.github.io`), los orígenes
  de `CORS_ORIGENES` y, para desarrollar, `localhost` y la red local. Los
  pedidos sin `Origin` (app móvil, webhooks) pasan, porque CORS es una regla de
  los navegadores: la autorización real la hace el token.
- **IP real del cliente** detrás del proxy de Render (`trust proxy`). Sin esto,
  todos los usuarios compartían la IP del proxy: el límite de login frenaba a
  todos juntos y la auditoría de accesos guardaba una IP equivocada.
- **Límites de pedidos por IP** (responden 429 con el mensaje en JSON):

| Ruta | Límite |
|---|---|
| Toda la API (salvo los webhooks de pago) | 900 cada 15 minutos |
| Login, recuperar contraseña, verificar usuario | 10 cada 15 minutos |
| Registro | 5 cada hora |
| Guardar cotización | 30 cada 10 minutos |
| Checkout, pago con tarjeta y confirmación | 20 cada 10 minutos |

**Derecho de supresión** (Ley 25.326, `src/servicios/eliminacionCuenta.js`):
`POST /api/perfil/eliminar-cuenta` pide la contraseña y elimina la cuenta. No
hace un `DELETE`: los envíos, pagos y comprobantes se tienen que conservar por
obligaciones fiscales, y el borrado en cascada se los llevaría. En cambio, en
una sola transacción:

- el usuario pasa a llamarse `eliminado-<id>`, pierde nombre y contraseña
  (queda un hash al azar) y se marca `eliminado_en`; el nombre de usuario queda
  libre para otra persona;
- se cierran todas sus sesiones;
- si era chofer, se borran nombre, email, teléfono, domicilio, DNI y las fotos
  de verificación (también del Storage);
- los envíos sin pagar se cancelan, y en envíos y cotizaciones se borran
  direcciones, coordenadas y descripción de la carga; el precio queda;
- los pagos conservan monto, estado y comprobante, pero el detalle del pagador
  y los últimos dígitos de la tarjeta se descartan;
- se borran sus tickets de soporte con los adjuntos;
- la auditoría de accesos se conserva sin IP ni user-agent.

No se puede eliminar una cuenta de admin, ni la de un cliente con un envío pago
todavía en curso, ni la de un chofer con un viaje asignado: primero tienen que
terminar (responde 409 explicando el motivo).

**Claves de Google**: la ruta por calles de la app móvil se pide a
`GET /api/recorridos`, que llama a Google Directions con `GOOGLE_DIRECTIONS_KEY`.
Esa clave nunca sale del servidor; las respuestas se guardan 30 minutos en
memoria y el endpoint exige sesión y tiene un límite de 60 consultas cada 10
minutos por IP, así que no sirve como proxy gratuito. Sin la clave responde 503
y la app muestra solo los puntos de retiro y entrega.

**Logs y errores** (`src/observabilidad/`): los logs salen con `pino`, en JSON,
una línea por evento. Cada pedido HTTP deja una línea al terminar:

```json
{ "level": "info", "time": "2026-11-12T23:45:24.906Z", "requestId": "054eaf04-…",
  "userId": 4, "method": "POST", "path": "/api/cotizaciones", "status": 201,
  "responseTime": 11.3, "ip": "181.95.67.131", "msg": "POST /api/cotizaciones 201 11.3ms" }
```

El `requestId` se devuelve en el encabezado `X-Request-Id` y en el cuerpo de los
500, así que si alguien reporta un error se busca ese id en los logs de Render y
aparecen juntas la línea del pedido y la del error. Los servicios loguean con
`log()`, que ya trae el `requestId` y el `userId` del pedido en curso aunque no
reciban el `req`. Contraseñas, tokens, números de tarjeta, DNI y el encabezado
`Authorization` se reemplazan por `[oculto]` antes de escribir. El chequeo de
salud solo se loguea cuando falla.

Los errores inesperados pasan por `registrarError`, que además del log los manda
a Sentry si está configurado `SENTRY_DSN`. A Sentry va solo el id del usuario:
nada del cuerpo del pedido, ni cookies, ni el token. `npm start` carga Sentry
con `node --import` antes que el resto, para capturar también los errores del
arranque y las promesas sin manejar. La app hace lo mismo con
`EXPO_PUBLIC_SENTRY_DSN`, y cuando la API responde un 5xx guarda su `requestId`
como rastro, de modo que el error de la app se puede cruzar con el del servidor.

Si se corta una conexión inactiva con PostgreSQL (reinicio del pooler, corte de
red), el pool lo registra y abre otra: antes ese evento tiraba abajo el proceso.

**Dependencias**: `npm audit` del backend da 0 vulnerabilidades. La CI no lo
exige todavía, así que conviene correrlo antes de cada entrega.

Las contraseñas se guardan hasheadas con bcrypt y nunca en texto plano, y las
sesiones viajan en un JWT firmado con expiración configurable a través de
`JWT_EXPIRA`. El login y la recuperación de contraseña tienen rate limiting de
diez intentos por IP cada quince minutos, y todos los intentos de acceso quedan
auditados en `auditoria_accesos` con IP, user-agent y resultado, sirvan o no.

Las cuentas de administrador no se pueden registrar ni restablecer desde la
aplicación, justamente para que no haya forma de escalar privilegios desde el
frontend. Todas las consultas SQL van parametrizadas, sin concatenar strings, de
manera que no hay superficie para inyección. Y el alta de chofer corre dentro de
una transacción, así el cambio de rol y la creación de la ficha se aplican juntos
o no se aplica ninguno.
