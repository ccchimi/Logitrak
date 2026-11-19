# Logitrak · Backend

API REST en Node.js con Express, montada sobre PostgreSQL. Resuelve la
autenticación con roles, el alta de choferes con verificación de identidad, la
auditoría de accesos y todo el circuito operativo: cotizaciones, envíos,
seguimiento, asignación a choferes, pagos, cupones de compensación, soporte y
notificaciones. Incluye sesiones renovables, permisos por capacidad, trabajos
persistentes con pg-boss y un outbox de eventos.

La API documentada del equipo está en [Render](https://logitrak.onrender.com).
El frontend web se publica por separado en [GitHub Pages](https://ccchimi.github.io/Logitrak/).
Ver también el [README general](../README.md) y el [del frontend](../frontend/README.md).
La configuración activa y la disponibilidad de cada servicio deben comprobarse
en el entorno correspondiente.

## Modelo de datos

El esquema se maneja con migraciones versionadas (`node-pg-migrate`), en
`migrations/`. Al arrancar, la API aplica las pendientes y después siembra los
datos base (el primer admin, si no hay ninguno, y la flota); cada migración corre una sola vez y queda
registrada en la tabla `pgmigrations`. Ver [Migraciones](#migraciones).

Las cuentas y sus roles viven en `usuarios`, y cuando alguien se convierte en
chofer se le crea además una ficha en `choferes` con su verificación de identidad
y el vehículo que declaró. Los intentos de login que llegan a la validación de credenciales se registran
en `auditoria_accesos`; los rechazos previos por esquema o límite de pedidos no
recorren necesariamente esa función. La flota disponible está en `vehiculos`, que es la que
determina qué envíos puede tomar cada chofer.

Del lado operativo, `cotizaciones` guarda cada presupuesto que emite Boxy con su
snapshot completo en JSONB, y cuando el cliente confirma se crea el `envio`, que
avanza por los estados `pendiente`, `asignado`, `en_viaje`, `entregado` o `cancelado`. Cada
hito de ese recorrido queda como una fila en `envio_eventos`, que es lo que
alimenta la línea de tiempo del seguimiento. Los viajes que toma cada chofer se
registran en `asignaciones`, los cobros en `pagos` y las compensaciones por SLA
incumplido en `cupones`. Cuando el envío se entrega, el cliente puede dejar una
calificación del chofer en `valoraciones` (una por envío, de 1 a 5 estrellas y
con comentario opcional). También se registran sesiones, tickets y mensajes de
soporte, eventos outbox, notificaciones y tokens push. El estado de pago se
mantiene separado del estado logístico. Las migraciones, no un diagrama o un
README histórico, definen el esquema vigente.

## Requisitos

- **Node.js 22.12.0 o superior**, según `package.json`; los workflows usan Node 22.
- npm y PostgreSQL alcanzable, local o en Supabase.
- Una base aislada para desarrollo y otra descartable para pruebas de integración.
- `DATABASE_URL` y `JWT_SECRET` propios del entorno.

Para trabajar solo en frontend puede usarse una API de desarrollo ya desplegada;
no es necesario iniciar esta API ni aplicar migraciones. No se debe apuntar a la
base operativa del equipo para pruebas exploratorias.

## Cómo correrlo

```bash
cd backend
npm ci
cp .env.example .env   # en PowerShell: copy .env.example .env
npm run dev            # con recarga automática (o npm start)
```

Antes del primer arranque hay que editar `.env` y configurar `DATABASE_URL` y
`JWT_SECRET`: ambos son obligatorios. Los valores reales y las credenciales no
se versionan.

**Iniciar el servidor no es una operación de solo lectura:** aplica migraciones
pendientes y siembra datos base. Usá una base de desarrollo al ejecutar estos
comandos; no se requiere ejecutar `db:init` antes de cada arranque.

Al arrancar, el servidor aplica el esquema y siembra la flota. Si la base no
tiene ningún administrador, crea el primero con `ADMIN_INICIAL_USUARIO` y
`ADMIN_INICIAL_CONTRASENA` (al menos 12 caracteres, sin contener el usuario);
si faltan, lo avisa en el log y no crea ninguno. Los demás admins se nombran
desde Usuarios, cambiando el rol. Además, el log avisa si algún admin tiene la
contraseña igual al usuario. La API queda escuchando en `http://localhost:4000`, o en el puerto que
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

Con la conexión y `JWT_SECRET` configurados, `npm run dev` inicializa la base
antes de habilitar las rutas de negocio. `npm run db:init` permite ejecutar esa
inicialización por separado, pero también escribe en la base.

TLS está activo por defecto. La configuración actual solo verifica la cadena
del certificado cuando `PGSSL_STRICT=true`; cifrar la conexión y verificar la
identidad del servidor son controles distintos. La validación del certificado
debe configurarse y comprobarse según el proveedor. `PGSSL=false` está disponible
para un PostgreSQL local que no use SSL, no como solución general de despliegue.

Cada conexión del pool (`src/db/pool.js`) trabaja con límites de tiempo, para
que una consulta trabada o una caída de Supabase devuelvan un error en lugar de
dejar el pedido esperando sin fin:

| Variable | Por defecto | Qué controla |
|---|---|---|
| `DB_LIMITE_CONSULTA_MS` | 15000 | Tiempo máximo de una consulta. Postgres la cancela con el código `57014` (`statement_timeout`). |
| `DB_LIMITE_TRANSACCION_INACTIVA_MS` | 30000 | Tiempo que una transacción puede quedar abierta sin actividad antes de que Postgres cierre la sesión (`idle_in_transaction_session_timeout`). |
| `DB_LIMITE_CONEXION_MS` | 10000 | Tiempo que el pool espera para obtener o abrir una conexión. |

Los valores se aplican con `SET` al abrir cada conexión, lo que funciona con el
Session pooler de Supabase. Un valor vacío, cero, negativo o no entero se
reemplaza por el de la tabla. Las migraciones (`src/db/migrar.js`) corren sin
límite, para que un cambio de esquema largo no quede a medias, y al terminar
devuelven la conexión al pool con los límites restaurados.

Si querés conectarte desde un cliente como DBeaver o IntelliJ, los datos salen
del mismo connection string: el host es el del pooler, el puerto 5432, la base
`postgres` y el SSL es obligatorio (`sslmode=require`).

## Entornos y configuración

El backend distingue tres entornos con la variable `ENTORNO`: `desarrollo`,
`staging` y `produccion`. Si no está definida, usa `produccion` con
`RENDER=true` o `NODE_ENV=production`; en los demás casos usa `desarrollo`. Al arrancar se carga `backend/.env.<entorno>`
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
| `GET /api/salud` | Base, migraciones y componentes | 200 en `ok` o `degradado`; 503 durante preparación o ante un fallo de base |

`/api/salud` devuelve el estado general (`ok`, `degradado` o `error`) y el de
cada componente. Ejemplo ilustrativo, no una medición del despliegue actual:

```json
{ "exito": true, "estado": "ok", "baseDeDatos": "conectada",
  "entorno": "produccion", "version": null, "activoDesdeSeg": 5,
  "componentes": {
    "baseDeDatos": { "estado": "ok", "latenciaMs": 9, "migracionesPendientes": 0 },
    "mercadoPago": { "estado": "ok" },
    "almacenamiento": { "estado": "no_configurado" },
    "googleDirections": { "estado": "configurado" },
    "modo": { "estado": "no_configurado" },
    "sentry": { "estado": "no_configurado" },
    "trabajos": { "estado": "ok" } },
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

Los motivos internos de los fallos de componentes se registran en los logs;
`version` toma el prefijo de `RENDER_GIT_COMMIT`, o `null` fuera de ese entorno.
La salud no prueba login, cobros ni entregas completas y la falta de una
integración opcional puede aparecer como `no_configurado` sin convertir todo el
servicio en un error. Como health
check de Render conviene `/api/salud/vivo`: si Supabase tiene un corte, no tiene
sentido que Render reinicie la API.

Al arrancar, la API abre el puerto enseguida y recién después aplica las
migraciones y los datos base (`src/arranque.js`). Mientras tanto `/api/salud` y
el resto de `/api` responden 503 con `"codigo": "iniciando"` y `Retry-After`, y
`/api/salud/vivo` ya da 200. Antes escuchaba recién con la base lista: en un
deploy donde la base tardaba (la instancia anterior todavía ocupaba las
conexiones), Render no veía el puerto abierto y cortaba el arranque por tiempo.
El log dice cuánto tardó la preparación (`API lista para atender pedidos`).

## Trabajos en segundo plano

Lo que tiene que pasar aunque nadie esté mirando la app corre con `pg-boss`
(`src/trabajos/`), sobre la misma base PostgreSQL: pg-boss crea y mantiene su
propio schema `pgboss` y usa el pool de la API, sin conexiones aparte. Los
workers corren dentro del proceso de la API (en Render Free hay una sola
instancia).

| Cola | Qué hace | Cuándo |
|---|---|---|
| `barrer-ofertas-vencidas` | Busca envíos pagos que ningún chofer tomó a tiempo y encola uno por envío | Cada minuto y al arrancar |
| `expirar-oferta` | Intenta reembolsar y cancela el envío según el resultado; puede dejar la devolución en revisión | Por envío, con reintentos |
| `barrer-sla` | Busca envíos pagos ya retirados, entregados o con el plazo de retiro vencido | Cada minuto y al arrancar |
| `revisar-sla` | Acredita un cupón de compensación y registra el evento `sla_excedido` | Por envío, con reintentos |
| `barrer-impagos` | Busca pedidos que no se pagaron dentro de `MINUTOS_PARA_PAGAR` (5) | Cada minuto y al arrancar |
| `eliminar-impago` | Revisa pagos en curso y, si corresponde, borra el pedido y sus registros dependientes | Por envío, con reintentos |
| `despachar-outbox` | Procesa eventos pendientes y genera avisos | Cada minuto, al arrancar y por activación tras registrar eventos |
| `vencer-cupones` | Marca como `vencido` los cupones activos pasados de fecha, salvo los aplicados a un pago en curso | Cada hora (minuto 7) y al arrancar |
| `avisar-cupones-por-vencer` | Registra `cupon.por_vencer` para los cupones activos que vencen dentro de `CUPONES_DIAS_AVISO` (7) días, una sola vez por cupón | Cada hora (minuto 37) y al arrancar |
| `barrer-pagos-de-mas` | Busca cobros duplicados o aprobados sobre un envío cancelado que todavía no se devolvieron y encola uno por pago | Cada minuto y al arrancar |
| `devolver-pago-de-mas` | Devuelve el pago al medio original (sin tocar el cupón) o lo deja en revisión si la pasarela no lo permite | Por pago, con reintentos |

**Pedidos sin pagar.** Cada envío nace con `pago_vence_en` (5 minutos). Pasado
ese límite el checkout, la tarjeta y la confirmación sandbox responden 409 con
`codigo: 'pedido_vencido'`, y la preferencia de Mercado Pago vence a la misma
hora. Transcurrido un minuto adicional de gracia, el pedido puede ser recogido
por un barrido y eliminado: en cascada se van sus eventos e intentos de pago,
la cotización queda `vencida` y se registra un evento para notificar al cliente.
No se garantiza la eliminación en un segundo exacto: depende del barrido, los
reintentos y la disponibilidad del proceso. Antes de borrar se le pregunta a la pasarela por los
intentos reales pendientes: si figura un pago aprobado o en proceso, el pedido
no se borra; si la pasarela no responde, se reintenta.

Cada trabajo por envío se reintenta hasta 6 veces con espera creciente (de 30
segundos a 15 minutos): un reembolso que la pasarela rechaza por un rato no
frena al resto. Si agota los reintentos, queda como fallido en pg-boss y va al
log y a Sentry si está configurado. Las colas usan la política `exclusive` y
los trabajos por envío se encolan con `singletonKey` para reducir duplicados;
las reglas de negocio y las transacciones también verifican si todavía aplica
cada operación. Al
arrancar se barre enseguida: Render Free duerme el servicio y al despertar no
esperamos al próximo minuto. El estado de los trabajos aparece en `/api/salud`.

Listar y tomar ofertas ya excluyen las vencidas por su cuenta, así que entre que
una oferta vence y el trabajo la cancela ningún chofer puede tomarla.

**SLA y cupones.** La regla es la que promete la cotización: "chofer en el
punto de retiro en menos de N min desde el pago o bonificamos el 10 % del
flete". N es el ETA de retiro de esa cotización más 5 minutos en tramos urbanos
o 10 en interurbanos (más de 50 km). El cálculo vive en el cotizador compartido
(`plazoRetiroMin` y `BONIFICACION_SLA_PCT` en
`frontend/src/services/botLogistica/tarifas.ts`), así que el texto que lee el
cliente y lo que hace cumplir el servidor salen del mismo código. Al crear el
envío, `sla_min` se toma de la cotización guardada (el `slaMin` que manda la app
se ignora) y `sla_vence_en` empieza a correr cuando se aprueba el pago.

El retiro es el primer paso a `en_viaje` (eventos `retirado` o `en_viaje` del
chofer) y queda en `retirado_en`; si el chofer entrega sin haberlo registrado,
cuenta la entrega. Si el retiro llegó tarde, o el plazo venció sin retiro, el
trabajo acredita un único cupón del 10 % y marca `sla_revisado_en`; con un
retiro a tiempo la revisión se cierra sin cupón, aunque la entrega se demore.
`MINUTOS_SLA` (20) queda solo para cotizaciones sin tiempos estimados. Los
envíos cancelados no reciben cupón por esta regla: se intenta devolver el pago
según el resultado de la pasarela. Antes el cupón lo pedía la app y
`POST /api/cupones` aceptaba el porcentaje que mandara el cliente; ahora esa
ruta emite cupones a mano para cuentas con `cupones.emitir` (soporte y admin),
y para el titular de un envío funciona como
"revisá el SLA de mi envío" (así las versiones viejas de la app no se rompen).

**Vencimiento de los cupones.** Cada cupón guarda `vence_en`: 90 días desde que
se emite, o lo que diga `CUPONES_DIAS_VIGENCIA`. Los cupones emitidos antes de
la migración vencen a los 90 días de su emisión. El trabajo `vencer-cupones`
los pasa a `vencido` una vez por hora, pero la fecha se controla también en el
momento: al pagar, un cupón pasado de fecha responde 409 (`cupon_no_disponible`,
"Ese cupón venció.") aunque el barrido no haya corrido, y `GET /api/cupones` lo
publica como `vencido` con su `venceEn`. Un cupón aplicado a un checkout que
sigue en curso no se vence hasta que el pago termina: si se aprueba, se consume
igual. Si después de la fecha se devuelve un pago que usó un cupón, el cupón
vuelve como `vencido` y no como `activo`.

**Aviso de cupón por vencer.** El trabajo `avisar-cupones-por-vencer` busca los
cupones activos que vencen dentro de `CUPONES_DIAS_AVISO` días (7 por
defecto; 0 lo apaga) y los marca con `aviso_vencimiento_en` en la misma
transacción que registra el evento, así cada cupón se avisa una sola vez
aunque haya dos instancias. Al despachar se vuelve a mirar el cupón: si ya se
usó o venció, no se notifica. El texto cuenta los días en la hora de Argentina
("vence hoy", "mañana", "en 5 días (el 24/11)").

## Eventos y notificaciones (outbox)

Lo que un hecho de negocio tiene que disparar afuera de su transacción (avisarle
al cliente mediante bandeja y, cuando está configurado, push) pasa por el patrón outbox
(`src/outbox/`):

1. La transacción que produce el hecho inserta una fila en `outbox_events` con
   `registrarEvento(cliente, …)`. Si la transacción se revierte, el evento no
   existe; si se confirma, queda garantizado aunque el proceso se caiga justo
   después. `registrarEvento` persiste el hecho sin enviar por sí mismo un aviso
   externo. Esto no implica que todas las otras transacciones de la aplicación
   estén libres de llamadas a proveedores.
2. El trabajo `despachar-outbox` (pg-boss) toma los pendientes y ejecuta el
   manejador de cada tipo. Cada evento se procesa en su propia transacción con
   `FOR UPDATE SKIP LOCKED`, junto con la marca `processed`: los efectos en la
   base quedan una sola vez aunque el evento se reprocese.
3. Si un manejador falla, el evento se reintenta con espera creciente (30 s,
   1 min, 2 min…); al octavo intento queda con `failed_at` y va al log y a
   Sentry. Los procesados se borran a los 30 días.

El despachador corre cada minuto y, además, 2 segundos después de cada evento
registrado. El tiempo efectivo depende de la cola y del servidor; no es una
garantía de entrega en tres segundos.

| Evento | Lo produce | Efecto |
|---|---|---|
| `pago.aprobado` | Aprobación del pago (tarjeta, webhook, consulta, sandbox) | Notificación al cliente con monto y comprobante |
| `pago.duplicado` | Un segundo pago aprobado sobre el mismo envío | Aviso a los admins: se devuelve solo |
| `pago.sobre_envio_cancelado` | Un pago aprobado con el envío ya cancelado | Aviso a los admins: se devuelve solo |
| `pago.devuelto` | Trabajo de devolución de pagos de más | Aviso al cliente con el monto devuelto |
| `pago.devolucion_fallida` | La pasarela no permitió devolver un pago de más | Aviso a los admins para devolverlo a mano |
| `envio.cancelado_sin_chofer` | Trabajo de expiración de ofertas | Notificación al cliente con el estado de la devolución |
| `cupon.acreditado` | Trabajo de revisión del SLA | Notificación al cliente con el cupón |
| `cupon.por_vencer` | Trabajo de aviso de cupones | Aviso al cliente ("vence mañana", "en 5 días"), que abre la Cuponera; no avisa si el cupón ya se usó |
| `envio.eliminado_sin_pago` | Limpieza de impagos vencidos | Aviso al cliente para volver a cotizar |
| `envio.asignado` | El chofer toma el envío | Aviso al cliente |
| `envio.entregado` | Confirmación con PIN y foto | Aviso al cliente con acceso al detalle |
| `envio.valorado` | El cliente califica un envío entregado | Aviso al chofer con las estrellas y si hay comentario |
| `envio.mensaje` | Un mensaje en el chat del envío | Aviso a la otra parte con el inicio del mensaje; uno solo por envío en la bandeja mientras no lo lea, push con cada mensaje |
| `usuario.datos_editados` | Un admin edita los datos de otra cuenta | Aviso al usuario con los datos que cambiaron |

Los payloads llevan ids, códigos y montos, nunca nombres ni direcciones. Las
notificaciones (`notificaciones`) son la bandeja de cada usuario en la app y se
borran al eliminar la cuenta. No hay mail: el modelo no guarda el email de los
clientes. El envío push ya está implementado después de confirmar el evento:
si falla, se registra y la notificación permanece en la bandeja. El outbox
protege la persistencia de los efectos en la base; no garantiza por sí solo la
entrega de un push al dispositivo.

## Entrega segura

Cada envío nace con un **PIN de 4 dígitos** aleatorio (`crypto.randomInt`). Lo ve
solo el cliente dueño, en el detalle del envío y mientras está en curso; él se
lo pasa a quien recibe. El chofer nunca lo ve.

Para cerrar la entrega, el chofer manda a `POST /api/asignaciones/:codigo/completar`
el PIN que le dicta el receptor y una **foto de comprobante** (JPG, PNG o WebP de
hasta 8 MB, validada por su contenido y no por lo que diga el pedido). El cierre
tiene tres pasos para no llamar a Storage con filas bloqueadas: se valida el PIN,
se sube la foto al bucket privado (`entregas/<envío>/…`) y recién entonces se
marca entregado, verificando de nuevo que el viaje siga en curso. Después de la
entrega el PIN se borra y el cliente ve la foto con un link firmado de 5 minutos
y recibe la notificación "Envío entregado".

Cada PIN incorrecto queda contado: a los 5 errores el envío se bloquea (responde
423) y lo desbloquea alguien del equipo (soporte o admin) con `POST /api/envios/:codigo/pin/desbloquear`.
La ruta además tiene un límite de 30 intentos cada 10 minutos por IP.

La ruta genérica `POST /api/envios/:codigo/eventos` ya no permite marcar un envío
como entregado o cancelado: solo registra los avances del viaje (en camino,
retirado, en viaje) y solo los puede registrar el chofer asignado o un admin.
Antes cualquiera con acceso al envío, incluido el cliente, podía marcarlo
entregado sin PIN. Si el cliente elimina su cuenta, la foto de comprobante se
borra del Storage.

## Tiempo real y push

**Ubicación del chofer (RF11).** Mientras lleva un envío, la app del chofer
manda su posición a `POST /api/asignaciones/ubicacion` (latitud, longitud y,
si el GPS los da, precisión, rumbo y velocidad en m/s), validada con Zod y con
un límite de 30 por minuto. El servidor busca el envío asignado o en viaje de
ese chofer (si no hay, responde 409 `sin_viaje`) y guarda una sola fila por
envío en `ubicaciones_chofer`, que se pisa en cada posición: no queda historial
del recorrido. Un trigger sobre `envios` borra esa fila cuando el envío se
entrega, se cancela o cambia de chofer. `GET /api/envios/:codigo` devuelve
`ubicacionChofer` (o `null`) a quien puede ver el envío, y por Realtime la
política `ubicaciones_chofer_lectura` deja leer la posición solo si el envío es
visible para el token y sigue en curso. La app recibe la fila en el aviso de
Realtime, sin volver a pedir el envío entero.

**Seguimiento en tiempo real.** La pantalla de seguimiento escucha por Supabase
Realtime los cambios de su envío (`envios`) y sus eventos nuevos
(`envio_eventos`), con el mismo token que el chat de soporte (lo firma el
backend en `GET /api/soporte/realtime`). El cliente ignora el payload de los
cambios recibidos y los usa como señal para volver a consultar la API; esto no
significa que el transporte de Realtime carezca de datos de filas. Con Realtime conectado, la consulta queda como respaldo cada
60 segundos; sin Realtime, cada 10 (antes era cada 5). Las políticas de solo
lectura dejan escuchar al cliente sus envíos, al chofer los que tiene asignados
y al personal autorizado (soporte y admin) la operación. Realtime se activa
solo si están `SUPABASE_URL`,
`SUPABASE_ANON_KEY` y `SUPABASE_JWT_SECRET`.

**RLS en todas las tablas.** La app recibe la anon key de Supabase para
conectarse a Realtime, y con esa clave la API REST de Supabase expone cualquier
tabla del schema `public` sin RLS. Por eso todas las tablas tienen RLS activo:
sin políticas, quien entre con la anon key o con el token de Realtime no lee
nada, salvo lo que habilitan las políticas de solo lectura de soporte y
seguimiento. El acceso del backend usa la conexión PostgreSQL configurada. El efecto de RLS
depende del rol de esa conexión y de los permisos realmente aplicados; no debe
suponerse que cualquier usuario de base puede omitir las políticas. Una
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

Estos comandos son para mantenimiento del esquema, no comprobaciones de solo
lectura. `up`, `down` y `db:init` pueden modificar o eliminar información.

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
tablas y por eso se niega a correr en los entornos desplegados (`staging` y
`produccion`, resueltos por `nombreEntorno`). Los retrocesos de otras
migraciones también pueden destruir datos; requieren revisión y respaldo del
entorno correspondiente.

El runner toma un advisory lock de PostgreSQL y, si otra instancia está
migrando, espera. Por eso `DATABASE_URL` tiene que usar el pooler de Supabase en
modo sesión (puerto 5432), no el de transacciones (6543), donde los locks de
sesión no funcionan.

## Pruebas

Hay dos tipos. Las unitarias (cálculo de precio, reglas de asignación, firma de
webhooks, permisos) necesitan las dependencias instaladas, pero no una base. Las de integración, en
`src/integracion/`, levantan la API completa y le pegan con `supertest` contra
un PostgreSQL real; sin `TEST_DATABASE_URL` se saltean.

```bash
docker run -d --rm --name logitrak-pg-prueba -e POSTGRES_PASSWORD=prueba -p 55432:5432 postgres:16-alpine
TEST_DATABASE_URL=postgresql://postgres:prueba@localhost:55432/postgres PGSSL=false npm test
TEST_DATABASE_URL=postgresql://postgres:prueba@localhost:55432/postgres PGSSL=false npm run test:cobertura
```

Las rutas principales tienen su archivo: `rutas-auth.test.js` (registro, login,
límite de intentos, sesiones, perfil y recuperación), `rutas-envios.test.js`
(alta idempotente, listado por cliente, detalle, reembolso y archivo) y
`rutas-pagos.test.js` (tarjeta aprobada y rechazada, checkout sandbox con
`Idempotency-Key`, confirmación, permisos y webhooks firmados),
`rutas-choferes.test.js` (postulación con verificación del DNI, documentos solo
para el admin, ofertas según el vehículo, tomar un envío y dos choferes que lo
toman a la vez), `rutas-admin.test.js` (listado de usuarios con filtros y
cambio de rol con sus negativas), `perfiles-admin.test.js` (el admin edita los
datos de otras cuentas: permisos, validaciones, aviso al usuario y vehículo con
viaje en curso), `rutas-perfil.test.js` (editar el perfil
del cliente y del chofer, cambio de contraseña, resumen y flota) y
`rutas-soporte.test.js` (consultas: quién ve qué, la conversación con el
asistente y el equipo, derivar, resolver, cerrar y la credencial de Realtime).
El reinicio de la base (`POST
/api/admin/reset`) solo se prueba en sus permisos: correrlo vaciaría la base que
comparten los archivos de prueba, que corren en paralelo. Además hay
pruebas de los trabajos de pg-boss, el outbox, la entrega con PIN, los roles y
el RLS.

La CI corre `npm run test:cobertura` con una base de PostgreSQL limpia y falla
si la cobertura baja de 85 % de líneas, 75 % de ramas u 80 % de funciones.

Por defecto, al correr bajo `node --test` no se cargan los archivos `.env`:
la configuración de pruebas sale de las variables del entorno, y
`levantarApi()` se niega a arrancar si el pool no apunta a `TEST_DATABASE_URL`.
Conviene usar una base descartable: si se reutiliza muchas veces, se acumulan
trabajos viejos de pg-boss y las pruebas que esperan un trabajo pueden tardar
más de la cuenta.

## Despliegue

El proyecto documenta Render como Web Service en
[logitrak.onrender.com](https://logitrak.onrender.com), con instalación mediante
`npm install` y arranque con `npm start`. Se despliega automáticamente con cada
push a `main`.

Las variables no salen del `.env`, que no se versiona, sino que se cargan en el
panel del servicio, en la sección Environment: van ahí `DATABASE_URL`,
`JWT_SECRET`, `PUBLIC_API_URL` con la URL pública, y las tres variables de
Supabase Storage. El servidor escucha en `process.env.PORT`; normalmente
conviene conservar el valor asignado por Render. La plataforma permite
reemplazarlo: si se cambia, el valor configurado y el puerto de escucha deben
coincidir. Ver [configuración de puertos de Render](https://render.com/docs/web-services#port-binding).

La documentación del proyecto contempla Render Free y sus períodos de
inactividad. Si el proceso está detenido o reiniciándose, se demoran el primer
acceso, la atención de webhooks y los trabajos en segundo plano. No se garantiza
un plazo fijo de arranque; la disponibilidad requerida debe evaluarse antes de
usar el servicio para operaciones productivas.

## Endpoints

Inventario extraído de `src/app.js` y `src/rutas/`. Salvo las excepciones
públicas indicadas, las rutas requieren `Authorization: Bearer <token>` y las
reglas de acceso del recurso. Una capacidad del backend no implica que exista
un control equivalente en el frontend.

### Salud y autenticación

| Método | Ruta | Función y acceso |
|---|---|---|
| GET | `/` | Identificación del servicio; público. |
| GET | `/api/salud/vivo` | Vida del proceso; público, sin consulta a la base. |
| GET | `/api/salud` | Preparación y salud de componentes; público. |
| POST | `/api/auth/login` | Valida credenciales; sesión normal o comprobación con encabezado `verificar`. |
| POST | `/api/auth/refresh` | Rota el refresh token y emite acceso; requiere refresh válido. |
| POST | `/api/auth/logout` | Revoca el refresh token indicado; no requiere JWT de acceso. |
| POST | `/api/auth/registro` | Crea cliente mediante registro público. |
| GET | `/api/auth/existe/:usuario` | Consulta pública de disponibilidad de nombre de usuario. |
| POST | `/api/auth/recuperar` | Restablecimiento público para cuentas que no son del equipo; ver limitación de identidad. |
| GET | `/api/auth/perfil` | Identidad del usuario autenticado. |

### Perfil, choferes y flota

| Método | Ruta | Función y acceso |
|---|---|---|
| GET | `/api/perfil/editable` | Datos editables de la cuenta autenticada. |
| PUT | `/api/perfil` | Actualiza campos admitidos de la propia cuenta; el cambio de contraseña valida la actual. |
| GET | `/api/perfil/resumen` | Resumen de la propia cuenta. |
| POST | `/api/perfil/exportar` | Copia en JSON de los datos de la propia cuenta; pide la contraseña, 5 por hora. |
| POST | `/api/perfil/eliminar-cuenta` | Anonimización con contraseña y restricciones operativas/por rol. |
| POST | `/api/choferes/postulacion` | Alta verificada de chofer; solo cliente autenticado. |
| GET | `/api/choferes/:codigo/documentos` | URLs firmadas de documentos; permiso `choferes.ver_documentos`. |
| GET | `/api/vehiculos` | Catálogo de flota; requiere sesión. |

### Cotizaciones, envíos y asignaciones

| Método | Ruta | Función y acceso |
|---|---|---|
| POST | `/api/cotizaciones` | Recalcula y guarda la cotización; cliente, chofer o admin. |
| GET | `/api/cotizaciones` | Cotizaciones propias; el personal con permiso puede consultar todas. |
| POST | `/api/envios` | Crea pedido desde cotización y comprueba titularidad. |
| GET | `/api/envios` | Lista según acceso y `estado`; hasta 200 registros, sin paginación general. |
| GET | `/api/envios/metricas` | Totales por estado según alcance del usuario. |
| GET | `/api/envios/:codigo` | Detalle, eventos, datos de entrega, calificación del envío y promedio del chofer; controla acceso al envío. |
| GET | `/api/envios/:codigo/mensajes` | Chat del envío: estado (abierto o motivo), contraparte y últimos 200 mensajes; marca como leídos los de la otra parte. Cliente, chofer del envío o personal. |
| POST | `/api/envios/:codigo/mensajes` | Texto de hasta 1000 caracteres, una foto en base64 (JPG, PNG o WebP de hasta 8 MB) o ambos; solo cliente o chofer del envío, mientras está asignado o en viaje (si no, 409 `chat_cerrado`); 30 por minuto. |
| GET | `/api/envios/:codigo/comprobante` | Comprobante en PDF; con `Accept: application/json`, en base64. Dueño del envío o personal; 409 `sin_pago` si no hay pago aprobado. |
| POST | `/api/envios/:codigo/eventos` | Avances permitidos del chofer asignado o admin; no cierra entregas ni cancela. |
| POST | `/api/envios/:codigo/cancelar` | Cancelación por el cliente dueño, mientras el envío está pendiente y sin chofer. Devuelve el importe si estaba pago o anula los intentos de pago pendientes; con un pago en curso en la pasarela responde 409. |
| POST | `/api/envios/:codigo/valoracion` | Calificación del chofer por el cliente dueño: `puntaje` entero de 1 a 5 y `comentario` opcional de hasta 500 caracteres. Solo con el envío entregado (409 si no) y una sola vez (409 si se repite). |
| POST | `/api/envios/:codigo/pin/desbloquear` | Desbloqueo de PIN; permiso `envios.desbloquear_pin`. |
| POST | `/api/envios/:codigo/reembolsar` | Solicita devolución; permiso `envios.reembolsar`. |
| POST | `/api/envios/:codigo/archivar` | Operación administrativa sobre envío, con opciones y validaciones de devolución; permiso `envios.archivar`. |
| POST | `/api/envios/:codigo/desarchivar` | Restauración administrativa de visibilidad; permiso `envios.archivar`. |
| GET | `/api/asignaciones/disponibles` | Ofertas vigentes compatibles; solo chofer. |
| POST | `/api/asignaciones/:codigoEnvio/tomar` | Toma una oferta con control de concurrencia; solo chofer. |
| GET | `/api/asignaciones/activa` | Asignación en curso del chofer. |
| POST | `/api/asignaciones/ubicacion` | Última posición GPS del chofer para su envío en curso; solo chofer, 30 por minuto. |
| GET | `/api/asignaciones/reputacion` | Promedio, cantidad, distribución por estrellas y últimas 5 calificaciones del chofer; solo chofer. |
| POST | `/api/asignaciones/:codigo/completar` | PIN y foto para cerrar la asignación del chofer. |
| GET | `/api/asignaciones` | Historial de asignaciones del chofer. |
| GET | `/api/recorridos` | Ruta entre coordenadas; sesión, validación, caché y límite de consultas. |

### Pagos y cupones

| Método | Ruta | Función y acceso |
|---|---|---|
| POST | `/api/pagos/checkout` | Inicia/reutiliza checkout; sesión y acceso al envío, `Idempotency-Key` opcional. |
| POST | `/api/pagos/tarjeta` | Procesador simulado; sesión y acceso al envío, `Idempotency-Key` opcional. |
| POST | `/api/pagos/:codigo/confirmar` | Confirma exclusivamente un pago sandbox autorizado. |
| GET | `/api/pagos/retorno` | Página pública de retorno del proveedor. |
| GET | `/api/pagos/:codigo` | Consulta de pago con control de acceso; puede conciliar con la pasarela. |
| GET | `/api/pagos` | Lista según permisos; filtro `envioCodigo`, hasta 100 registros. |
| POST | `/api/pagos/webhook/mercadopago` | Sin JWT de usuario; exige firma de Mercado Pago y consulta el pago al proveedor. |
| POST | `/api/pagos/webhook/modo` | Sin JWT de usuario; consulta intención al proveedor. Requiere revisar autenticación y pruebas antes de activar MODO real. |
| GET | `/api/cupones` | Cupones propios con su fecha de vencimiento (`venceEn`), hasta 100 registros. |
| POST | `/api/cupones` | Soporte/admin emiten manualmente; otros usuarios solicitan revisión del SLA de su propio envío. |

### Administración, soporte y notificaciones

| Método | Ruta | Función y acceso |
|---|---|---|
| GET | `/api/admin/usuarios` | Listado, filtros, resumen y paginación; permiso `usuarios.listar`. |
| GET | `/api/admin/usuarios/:id` | Datos editables de una cuenta y, si es chofer, su ficha; permiso `usuarios.editar`. |
| PUT | `/api/admin/usuarios/:id` | Edita el nombre y, en choferes, email, teléfono, domicilio y vehículo; permiso `usuarios.editar`. |
| PUT | `/api/admin/usuarios/:id/rol` | Cambia rol entre cliente, soporte y admin; permiso `usuarios.cambiar_rol` y restricciones de integridad. |
| POST | `/api/admin/reset` | Reinicio destructivo de información; permiso `sistema.reiniciar`. No usar como diagnóstico. |
| GET | `/api/soporte/realtime` | Credencial de lectura Realtime para la sesión. |
| GET | `/api/soporte/tickets` | Lista tickets propios o del equipo, según permiso. |
| POST | `/api/soporte/tickets` | Crea ticket para la cuenta autenticada. |
| GET | `/api/soporte/tickets/:codigo` | Detalle e hilo con control de acceso. |
| POST | `/api/soporte/tickets/:codigo/mensajes` | Agrega mensaje/adjuntos según acceso al ticket. |
| POST | `/api/soporte/tickets/:codigo/escalar` | Deriva la consulta al equipo según reglas del ticket. |
| POST | `/api/soporte/tickets/:codigo/resolver` | Resuelve el ticket según titularidad/permisos. |
| POST | `/api/soporte/tickets/:codigo/cerrar` | Cierre por el equipo; permiso `soporte.atender`. |
| GET | `/api/notificaciones` | Bandeja propia y contador; filtros `soloNoLeidas` y `limite`. |
| POST | `/api/notificaciones/leidas` | Marca notificaciones propias, por `ids` o todas. |
| POST | `/api/notificaciones/push-token` | Registra token Expo de la sesión. |
| DELETE | `/api/notificaciones/push-token` | Da de baja token Expo propio. |

Los detalles de body, límites y validaciones están en cada ruta y en
`src/esquemas/`. Las respuestas de negocio suelen usar `exito` y `error`, pero
los webhooks pueden responder solo con estado HTTP y `/api/pagos/retorno`
devuelve HTML. No debe asumirse que todos los endpoints comparten un único
formato JSON.

Los errores incluyen 400 (entrada inválida), 401 (credenciales/token),
403 (permisos), 404 (recurso/ruta), 409 (conflicto o pedido vencido),
422 (reglas de identidad/idempotencia), 423 (PIN bloqueado), 429 (límites),
503 (preparación o servicio requerido ausente) y 500 (error interno), según
el endpoint.

## Mi Perfil y reautenticación

`GET /api/perfil/editable` devuelve `usuario`, `rol`, `nombreCompleto` y ficha
`chofer` cuando corresponde. `PUT /api/perfil` admite nombre y cambio de
contraseña; para un chofer admite además email, teléfono, domicilio y vehículo.
No implementa cambio del nombre de usuario, ni campos separados de nombre y
apellido para todos los roles.

La contraseña actual se compara con bcrypt contra el hash del usuario del JWT
cuando el body pide cambiar la contraseña. No se exige esa misma comprobación
para cada modificación de los otros campos.

Existe una comprobación de credenciales en `POST /api/auth/login` con
`X-Logitrak-Sesion: verificar`: devuelve la identidad sin crear una nueva sesión.
No es un endpoint independiente de autorización de cambios ni emite un permiso
breve vinculado al usuario y campo. El frontend compara la identidad devuelta,
pero eso no convierte la operación posterior en una edición reautenticada por
el servidor. Por ese motivo mantiene bloqueada la edición individual de varios
datos. Email y teléfono no tienen un circuito de confirmación de nuevo contacto.

Para habilitar ese comportamiento hace falta un contrato de backend que valide
la contraseña y el cambio sensible en una operación, o un permiso de
reautenticación acotado y verificable al guardar. Esta documentación no
implementa ninguna de esas alternativas.

## Consulta administrativa e integración con el frontend

El backend permite listar usuarios con búsqueda, rol, fechas, orden y
paginación; `consultaUsuariosAdmin` valida la consulta. Soporte puede consultar,
pero cambiar roles está reservado al admin. No hay un endpoint general para que
el administrador edite todos los datos del perfil de otra cuenta.

`GET /api/envios` admite filtro por estado y limita el resultado a 200 registros.
No proporciona paginación completa ni todos los filtros de búsqueda y fechas
que muestra el frontend. `GET /api/envios/metricas` devuelve totales por estado;
los indicadores de últimas 24 horas del panel se calculan en la app sobre lo
recuperado, no mediante un endpoint exclusivo de analítica histórica.

El cliente intenta ampliar por estado si la lista no coincide con las métricas,
pero siguen existiendo límites. Consultar la operación y obtener un histórico
completo son capacidades distintas. La consulta excluye registros con
`archivado_en`, aunque la interfaz no exponga herramientas de archivo.

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
decidir centralmente a qué chofer le toca cada viaje, publicamos el envío y dejamos
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
cierra con `completar`, que exige el PIN del receptor y la foto de comprobante
(ver [Entrega segura](#entrega-segura)).

El punto interesante es qué pasa si dos choferes tocan el botón al mismo tiempo.
Lo resolvemos con un `UPDATE` condicional sobre la fila del envío, que solo
modifica si `chofer_id IS NULL`, todo dentro de una transacción. Como PostgreSQL
serializa las escrituras sobre la misma fila, exactamente uno gana y el otro
recibe un `409` con el motivo. No necesitamos ni un bloqueo explícito ni una cola
externa para garantizarlo.

## Roles y permisos

Hay cuatro roles:

| Rol | Cómo se obtiene | Qué hace |
|---|---|---|
| `cliente` | Registrándose en la app | Cotiza, paga y sigue sus envíos |
| `chofer` | Postulación aprobada en "Trabajá con nosotros" (vehículo y verificación de identidad) | Toma envíos y los entrega |
| `soporte` | Lo asigna un admin | Atiende consultas y mira la operación |
| `admin` | Lo asigna otro admin; el primero se crea con `ADMIN_INICIAL_USUARIO` y `ADMIN_INICIAL_CONTRASENA` (`src/db/admins.js`) | Todo, incluidos reembolsos, roles y mantenimiento |

Los permisos se definen por **capacidad** en `src/middleware/permisos.js`: cada
acción sensible tiene un nombre (`envios.reembolsar`, `soporte.atender`…) y una
matriz dice qué roles la tienen. Las operaciones del equipo usan `exigirPermiso('…')` o
`tienePermiso(req.usuario, '…')`. Otras rutas todavía usan `exigirRol` o reglas
específicas de titularidad, por lo que añadir un rol exige revisar también esas
validaciones. Un nombre de permiso mal
escrito falla al cargar la ruta, no en un pedido.

| Capacidad | soporte | admin |
|---|:---:|:---:|
| `envios.ver_todos`, `cotizaciones.ver_todas`, `pagos.ver_todos` | ✔ | ✔ |
| `soporte.atender` (responder y cerrar consultas de cualquier cliente) | ✔ | ✔ |
| `cupones.emitir`, `envios.desbloquear_pin`, `usuarios.listar` | ✔ | ✔ |
| `envios.reembolsar`, `envios.archivar`, `envios.registrar_avance`, `pagos.gestionar` | | ✔ |
| `choferes.ver_documentos` (fotos de DNI y selfie) | | ✔ |
| `usuarios.cambiar_rol`, `usuarios.editar`, `sistema.reiniciar` | | ✔ |

El login devuelve la lista de permisos del rol y la app muestra u oculta
acciones con eso; la API los vuelve a verificar en cada pedido.

**Cambiar un rol**: `PUT /api/admin/usuarios/:id/rol` con `{ rol: 'cliente' |
'soporte' | 'admin' }`, solo admin. Un admin no puede cambiar su propio rol ni
sacarle el rol al último admin, y los choferes no pasan por acá (su rol sale de
la postulación verificada). El cambio cierra las sesiones de esa cuenta: con el
token de acceso ya emitido conserva su rol hasta vencer: por defecto son
15 minutos en el circuito con refresh y 8 horas en el de compatibilidad, con
plazos configurables. Queda en el
log con quién lo hizo.

**Editar los datos de otra cuenta**: `GET` y `PUT /api/admin/usuarios/:id`,
solo admin (`usuarios.editar`). El `PUT` acepta `nombreCompleto` en cualquier
cuenta y, si la cuenta tiene ficha de chofer, `email`, `telefono`, `domicilio`
y `vehiculoId`, con las mismas reglas que Mi Perfil; cualquier otro campo
(usuario, contraseña, DNI, rol) responde 400. Solo se guardan los campos que
cambian, y el nombre de un chofer se actualiza en `usuarios` y en `choferes`.
No se editan los datos propios (409, van por Mi Perfil), las cuentas eliminadas
(404) ni el vehículo de un chofer con un viaje en curso (409). Cada edición
registra el evento `usuario.datos_editados`, que le avisa al usuario qué datos
cambiaron, y queda en el log con quién la hizo.

El personal (soporte y admin) no puede restablecer la contraseña ni eliminar su
cuenta desde la app. En Supabase, las políticas de lectura de Realtime
reconocen a soporte como parte del equipo (`logitrak_es_personal()`), así que
recibe en vivo las consultas y ve los envíos.

## Verificación de identidad

La implementación activa sin credenciales RENAPER verifica datos de DNI por
PDF417, coincidencia con nombre y apellido ingresados y el resultado de selfie
que envía el cliente. `LIVENESS_REQUERIDO=true` exige además el resultado de la
prueba de vida. Esta comprobación offline no equivale a una validación oficial
de identidad, ni una bandera enviada por la app constituye por sí sola una
prueba biométrica verificable por el servidor.

**RENAPER real todavía no está implementado.** `llamarApiReal` en
`src/servicios/verificacionIdentidad.js` lanza un error. Definir
`RENAPER_API_URL` y `RENAPER_API_KEY` selecciona ese camino pendiente, no una
integración funcional. Hace falta implementar y validar el contrato antes de
configurarlo como proveedor activo.

La prueba de vida con ML Kit se ejecuta en un build nativo compatible de la app;
no está disponible de forma equivalente en web o Expo Go. La comparación facial
de servidor usa `faceMatch.js`, requiere `@tensorflow/tfjs-node` y los modelos
`ssdMobilenetv1`, `faceLandmark68Net` y `faceRecognitionNet` en `backend/models`
o `FACE_MODELS_DIR`. El runtime TensorFlow no está declarado como dependencia
normal del backend y su instalación/compatibilidad debe resolverse por separado.

`FACE_MATCH_REQUERIDO=true` rechaza una comparación disponible que no coincide.
Actualmente, si faltan imágenes, runtime o modelos, o si no se detecta una cara,
la ruta no aplica el mismo rechazo: no debe describirse esta bandera como una
garantía de bloqueo ante toda verificación facial incompleta. Cuando hay
comparación se registra su distancia en `face_match_score`.

La postulación aprobada crea la ficha y cambia el rol a `chofer` en una
transacción. Esto no implementa una cola general de revisión manual por un
administrador.

### Dónde quedan las fotos

La selfie y la foto del DNI se suben a Supabase Storage, en un bucket privado que
por defecto se llama `verificacion-identidad`. En la base guardamos únicamente la
ruta interna del objeto, en `selfie_path` y `dni_frente_path`, nunca la imagen ni
una URL pública. Para revisarlas está `GET /api/choferes/:codigo/documentos`,
que solo responde a un admin y devuelve URLs firmadas que vencen a los 5 minutos,
sin publicar directamente los objetos del bucket. Las URLs firmadas siguen
siendo accesos temporales y deben tratarse como información privada. Los adjuntos del chat de soporte
usan el mismo bucket con URLs de 10 minutos. Antes de la primera subida, el servidor revisa que
el bucket sea privado y se niega a subir nada si alguien lo marcó como público.

La configuración va en el `.env` y en el panel de Render:

| Variable | Qué es |
|----------|--------|
| `SUPABASE_URL` | URL base del proyecto, sin `/rest/v1` (por ejemplo `https://turef.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role`, secreta y solo de servidor |
| `SUPABASE_BUCKET` | Nombre del bucket privado |

El bucket hay que crearlo antes del primer uso. Si estas variables quedan vacías
las imágenes caen al disco local, lo cual alcanza para desarrollo. En entornos desplegados (`staging` o `produccion`, según
`src/config/entorno.js`) no se escriben fotos de documentos en disco: sin Storage, el alta puede continuar sin fotos de verificación y se registra
el problema. La entrega con foto tiene sus propios requisitos de almacenamiento.

## Chat del envío (RF13)

El cliente y el chofer de un envío conversan en `envio_mensajes`
(`src/rutas/chatEnvios.js`, montado en `/api/envios`). El chat se abre cuando un
chofer toma el envío y se cierra al entregarlo, cancelarlo o archivarlo; antes
y después responde 409 `chat_cerrado` con el motivo, y la conversación queda
para leer. El estado del envío se vuelve a mirar con `FOR UPDATE` al guardar el
mensaje, así no entra uno después de la entrega. El personal con
`envios.ver_todos` lee la conversación (por ejemplo, ante un reclamo) pero no
escribe, y su lectura no marca los mensajes como leídos. Al abrir el chat se
marcan leídos los mensajes de la otra parte; `GET /api/envios/:codigo` suma
`chat: { abierto, mensajes, noLeidos }`. Cada mensaje registra `envio.mensaje`
en el outbox: la otra parte recibe un push con el inicio del texto y, en la
bandeja, un solo aviso por envío mientras no lo lea. Por Realtime, la política
`envio_mensajes_lectura` deja leer los mensajes a quien puede ver el envío. La
exportación de datos incluye los chats, y al eliminar la cuenta del cliente se
borran los de sus envíos (y lo que haya escrito como chofer en otros).

Un mensaje puede llevar texto, una foto o ambos. La foto se valida por su
contenido real (JPG, PNG o WebP de hasta 8 MB, con `leerFoto`, la misma
validación que la foto de entrega) y se guarda en el Storage privado en
`chat/<envío>/`; en desarrollo sin Storage, en `backend/uploads/chat`. Se
muestra con una URL firmada de 10 minutos (en desarrollo, embebida). Si la foto
se sube pero el mensaje no llega a guardarse (por ejemplo, porque el envío se
entregó en el medio), se borra. El aviso de un mensaje con foto dice "📷 Foto"
o lleva el 📷 delante del texto. Al eliminar la cuenta se borran también las
fotos de esos chats, y la exportación indica qué mensajes tenían foto.

## Comprobante del envío (RF14)

`GET /api/envios/:codigo/comprobante` arma un PDF con `pdfkit`
(`src/servicios/envios/comprobante.js`): cliente, envío (direcciones, carga,
peso, vehículo, distancia y fechas), chofer, cómo se confirmó la entrega y el
pago que cubrió el envío, con el medio de pago, el comprobante `COMP-…`, el
cupón y el descuento si los hubo, y el total. Las fechas van en hora de
Argentina. Toma el pago aprobado o, si se devolvió, el último devuelto (y lo
indica); los cobros duplicados no aparecen. El pie aclara que no es una factura
ni un comprobante fiscal. Lo descargan el dueño del envío y el personal con
`envios.ver_todos`; responde `Cache-Control: no-store`. Por defecto devuelve el
PDF como adjunto; la app pide `Accept: application/json` y lo recibe en base64,
para usar el mismo cliente HTTP con renovación de sesión. El envío por mail
queda pendiente: el modelo no guarda el email de los clientes.

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
el encabezado opcional `Idempotency-Key` (UUID). La app conserva la clave de la
operación si reintenta por falta de conexión: repetir el pedido con la misma clave devuelve el resultado original en
vez de cobrar de nuevo, y usarla para otro envío o método responde 422. Además,
cada pedido bloquea el envío dentro de una transacción, así que reintentos y
doble clic se serializan; un checkout pendiente del mismo envío y método con
menos de 15 minutos puede reutilizarse si cumple las condiciones de
`intentos.js`. Ese criterio no amplía el plazo de pago del envío (5 minutos
por defecto). Se reutiliza en lugar de crear otro pago y otra preferencia, y si
la pasarela falla no queda ninguna fila huérfana. Aprobar también es
idempotente, y si un envío llegara a recibir un segundo cobro aprobado, ese pago
queda marcado como duplicado (`detalle.duplicadoDe`) y el trabajo
`devolver-pago-de-mas` lo devuelve solo (lo mismo con un cobro que llega con el
envío ya cancelado). La devolución no toca el cupón: el pago de más nunca lo
consumió. Solo Mercado Pago tiene devolución por API; un cobro real por otro
medio queda con `detalle.reembolsoEnRevision` y un aviso a los admins, y no se
marca como devuelto hasta que alguien lo haga.

El QR real se genera a partir del enlace `init_point` de Checkout Pro. El texto
de la interfaz menciona MODO, pero este código no implementa por sí mismo un QR
interoperable de Transferencias 3.0. La aceptación desde otras billeteras debe
validarse con el proveedor y un flujo de prueba autorizado.

La integración directa con MODO no está seleccionable en la pantalla actual.
`servicios/pagos/modo.js` y su webhook siguen presentes: admiten configuración
mediante `MODO_API_URL`, `MODO_CLIENT_ID`, `MODO_CLIENT_SECRET`, `MODO_STORE_ID`
y las URLs opcionales `MODO_TOKEN_URL`, `MODO_INTENTION_URL`, `MODO_STATUS_URL`.
Sin configuración se usa sandbox. La disponibilidad de credenciales no confirma
compatibilidad productiva ni activa por sí sola una opción en la interfaz.

El pago con tarjeta, en cambio, es simulado siempre. El procesador valida el
número por el algoritmo de Luhn, la marca, el vencimiento y el CVV, y guarda
únicamente la marca y los últimos cuatro dígitos: el número completo nunca se
persiste en el registro de pago. **No deben usarse tarjetas reales en este
circuito simulado.** Para cobrar de verdad hace falta diseñar una integración
con un proveedor que tokenice los datos en el cliente y revisar los requisitos
aplicables al tratamiento de datos de pago. Habría que reemplazar `servicios/pagos/tarjeta.js` por
un gateway que tokenice la tarjeta del lado del cliente, de forma que el número
no pase nunca por este backend. En el sandbox se aprueban las tarjetas de las
marcas admitidas que superan todas las validaciones de número, titular,
vencimiento y CVV, salvo el `4000 0000 0000 0002`, que rechazamos a propósito para
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
revoca el refresh token de la sesión del dispositivo. La recuperación por
`/api/auth/recuperar` revoca los refresh tokens de la cuenta; el cambio por
`PUT /api/perfil` no llama actualmente a esa revocación. Un JWT de acceso ya
emitido no se invalida inmediatamente por revocar el refresh: `autenticar`
comprueba firma y expiración, no consulta el estado de la sesión en la base. Un token de acceso vencido responde 401 con `codigo: 'token_vencido'`, y
la app lo renueva sola y repite el pedido.

Compatibilidad: la app nueva se identifica con el encabezado
`X-Logitrak-Sesion: refresh`. Las versiones viejas no lo mandan y siguen
recibiendo el token de `JWT_EXPIRA` (8 h) sin refresh token, como antes; ese
camino se puede quitar cuando nadie las use.

**Validación de entradas** (`src/middleware/validar.js` y `src/esquemas/`):
auth, cotizaciones, creación de envíos, pagos y postulación usan esquemas de
Zod. Otras operaciones, como partes de perfil, soporte y cupones, mantienen
validaciones manuales; la validación no está unificada en todas las rutas. Si el pedido no lo cumple se corta antes de
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
| Exportar los datos de la cuenta | 5 cada hora |

**Exportación de datos** (`src/servicios/exportacionCuenta.js`):
`POST /api/perfil/exportar` pide la contraseña y devuelve un JSON con todo lo
que se guarda de la cuenta (derecho de acceso de la Ley 25.326, art. 14):
datos de la cuenta, cotizaciones, envíos con su historial y coordenadas,
pagos, cupones, calificaciones, tickets de soporte con sus mensajes,
notificaciones, sesiones, dispositivos con push y los últimos 200 intentos de
ingreso; a un chofer le suma sus datos, la verificación de identidad, los
viajes y las calificaciones recibidas. Quedan afuera el hash de la contraseña,
los hashes de las sesiones, los tokens de push, el PIN de entrega y las rutas
de los archivos (solo se indica si existen). La respuesta lleva
`Cache-Control: no-store`.

**Eliminación y anonimización** (`src/servicios/eliminacionCuenta.js`):
`POST /api/perfil/eliminar-cuenta` pide la contraseña. El usuario se anonimiza
en lugar de borrarse físicamente y se conservan registros de la operación. Esta
descripción refleja el código, no certifica cumplimiento legal ni define por sí
sola los plazos de conservación. En una transacción:

- el usuario pasa a llamarse `eliminado-<id>`, pierde nombre y contraseña
  (queda un hash al azar) y se marca `eliminado_en`; el nombre de usuario queda
  libre para otra persona;
- se cierran todas sus sesiones;
- si era chofer, se quitan datos personales y referencias a las fotos;
  el borrado de archivos en Storage se intenta después de confirmar la transacción;
- los envíos sin pagar se cancelan, y en envíos y cotizaciones se borran
  direcciones, coordenadas y descripción de la carga; el precio queda;
- en las calificaciones que dejó se borra el comentario y queda el puntaje,
  para que el promedio del chofer no cambie;
- los pagos conservan monto, estado y comprobante, pero el detalle del pagador
  y los últimos dígitos de la tarjeta se descartan;
- se borran tickets de soporte y se reúnen sus adjuntos para intentar el borrado externo;
- la auditoría de accesos se conserva sin IP ni user-agent.

No se puede eliminar una cuenta de soporte o admin, ni la de un cliente con un envío pago
todavía en curso, ni la de un chofer con un viaje asignado: primero tienen que
terminar (responde 409 explicando el motivo).

**Claves de Google**: la ruta por calles de la app móvil se pide a
`GET /api/recorridos`, que llama a Google Directions con `GOOGLE_DIRECTIONS_KEY`.
Esa clave nunca sale del servidor; las respuestas se guardan 30 minutos en
memoria y el endpoint exige sesión y tiene un límite de 60 consultas cada 10
minutos por IP. Esto limita su uso pero no equivale a una garantía de ausencia
de abuso o consumo de cuota. Sin la clave responde 503
y la app muestra solo los puntos de retiro y entrega.

**Logs y errores** (`src/observabilidad/`): los logs salen con `pino`, en JSON,
una línea por evento. Cada pedido HTTP deja una línea al terminar:

```json
{ "level": "info", "time": "2026-11-12T23:45:24.906Z", "requestId": "054eaf04-…",
  "userId": 4, "method": "POST", "path": "/api/cotizaciones", "status": 201,
  "responseTime": 11.3, "ip": "192.0.2.1", "msg": "POST /api/cotizaciones 201 11.3ms" }
```

El `requestId` se devuelve en el encabezado `X-Request-Id` y en el cuerpo de los
500, así que si alguien reporta un error se busca ese id en los logs de Render y
aparecen juntas la línea del pedido y la del error. Los servicios loguean con
`log()`, que ya trae el `requestId` y el `userId` del pedido en curso aunque no
reciban el `req`. El logger contiene reglas de ocultamiento para contraseñas, tokens,
números de tarjeta, DNI y `Authorization`. Esas reglas deben mantenerse y
verificarse al introducir campos o mensajes nuevos; no habilitan registrar
cuerpos sensibles sin revisión. El chequeo de
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

**Dependencias**: el resultado de `npm audit` depende de la fecha, el lockfile
y las bases de avisos vigentes. No se afirma un número permanente de
vulnerabilidades. Debe ejecutarse y evaluarse en cada revisión; el workflow
actual no impone una auditoría de dependencias del backend como condición.

Las contraseñas de usuarios se almacenan con bcrypt. Los tokens de acceso
usan `ACCESS_TOKEN_EXPIRA` en el circuito con refresh y `JWT_EXPIRA` en el
circuito de compatibilidad. El login y la recuperación de contraseña tienen rate limiting de
diez intentos por IP cada quince minutos, y los intentos que llegan a la función de auditoría se registran en
`auditoria_accesos` con IP, user-agent y resultado.

El registro público crea clientes y la recuperación excluye cuentas del equipo.
Los permisos por rol no certifican por sí solos la seguridad de todos los flujos.
Las consultas usan parámetros para valores y algunas construyen filtros o
columnas con listas controladas; hay que mantener esa separación al agregar
consultas. No se afirma que el sistema esté libre de inyección u otras
vulnerabilidades por usar esas técnicas.

Los datos de ficha y el cambio de rol del alta de chofer se guardan en una
transacción. Las subidas a Storage son efectos externos y no se revierten de
forma automática por un rollback de PostgreSQL.

## Limitaciones y revisiones pendientes

- Recuperación de contraseña: el contrato actual no acredita titularidad mediante
  un token o código enviado a un contacto verificado. No debe presentarse como
  recuperación segura para producción hasta corregir ese diseño.
- Cuentas admin anteriores: el código ya no siembra credenciales predecibles,
  pero las cuentas creadas antes conservan su contraseña. El log del arranque
  avisa si alguna es igual al usuario; hay que cambiarla desde Mi Perfil.
- Cambio de contraseña en perfil: falta unificar la revocación de sesiones con la
  recuperación y revisar el tratamiento de JWT ya emitidos.
- Edición individual de perfil: falta reautenticación vinculada al cambio y
  confirmación de nuevos contactos.
- Identidad: RENAPER real es una función pendiente y la obligatoriedad del match
  facial no bloquea todos los casos de verificación incompleta.
- Pagos: tarjeta es simulada; MODO real, webhooks y reembolsos necesitan pruebas
  específicas del proveedor/entorno. El webhook de MODO no aplica el mismo
  middleware de firma que Mercado Pago.
- Los cobros de más se devuelven solos solo por Mercado Pago; uno real de
  MODO queda en revisión para devolverlo desde su panel.
- Push se intenta después de confirmar el evento. Un fallo no elimina el aviso
  de la bandeja, pero tampoco garantiza una nueva entrega push.
- El borrado de archivos externos después de anonimizar puede fallar; se
  registra, y hace falta un mecanismo de recuperación periódica.
- Faltan paginación de envíos, filtros de servidor e históricos adecuados para
  un panel administrativo de mayor volumen.
- Disponibilidad, restricciones de claves y credenciales de servicios externos
  deben revisarse en sus paneles; no se verifican leyendo el repositorio.

Ver [pendientes](../docs/pendientes-logitrak.md), [roadmap](../docs/ROADMAP.md) y
[plan de mantenimiento](../docs/qa/plan-de-mantenimiento.md). Son documentación
de apoyo y pueden conservar referencias históricas que deben contrastarse con
el código.
