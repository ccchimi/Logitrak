# Logitrak · Backend

API REST en Node.js con Express, montada sobre PostgreSQL. Resuelve la
autenticación con roles, el alta de choferes con verificación de identidad, la
auditoría de accesos y todo el circuito operativo: cotizaciones, envíos,
seguimiento, asignación a choferes, pagos y cupones de compensación.

## Modelo de datos

El esquema completo está en `src/db/schema.sql` y se aplica solo al arrancar, así
que no manejamos migraciones a mano. Es idempotente: las tablas se crean si no
existen y las columnas nuevas se agregan con `ALTER TABLE ... IF NOT EXISTS`, de
modo que un despliegue sobre una base ya poblada no rompe nada.

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
npm run db:init   # aplica el esquema y siembra admins y flota
npm run dev
```

El TLS va activo por defecto, que es lo que Supabase exige. Si alguna vez
aparece un error de certificado del pooler no hace falta tocar nada, porque no
validamos la cadena salvo que definas `PGSSL_STRICT=true`.

Si querés conectarte desde un cliente como DBeaver o IntelliJ, los datos salen
del mismo connection string: el host es el del pooler, el puerto 5432, la base
`postgres` y el SSL es obligatorio (`sslmode=require`).

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
| POST | `/api/cotizaciones` | Guarda una cotización emitida por Boxy |
| GET | `/api/cotizaciones` | Cotizaciones del usuario (admin ve todas) |
| POST | `/api/envios` | Confirma una cotización y crea el envío |
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
que solo responde a un admin y devuelve URLs firmadas que expiran, de manera que
el bucket nunca queda expuesto.

La configuración va en el `.env` y en el panel de Render:

| Variable | Qué es |
|----------|--------|
| `SUPABASE_URL` | URL base del proyecto, sin `/rest/v1` (por ejemplo `https://turef.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role`, secreta y solo de servidor |
| `SUPABASE_BUCKET` | Nombre del bucket privado |

El bucket hay que crearlo antes del primer uso. Si estas variables quedan vacías
las imágenes caen al disco local, lo cual alcanza para desarrollo, pero en Render
el disco se borra en cada despliegue: en producción son obligatorias.

## Pagos

El cobro sucede una vez que el envío está confirmado. El método principal es
Mercado Pago, que es una integración real y delega en la pasarela cuando hay
credenciales cargadas; si no las hay, el checkout por QR cae a un modo sandbox
que se aprueba desde la aplicación. Cuando el pago se aprueba emitimos un
comprobante con el formato `COMP-AAAA-NNNNNN` y el envío pasa a
`estado_pago = 'pagado'`, que es lo que lo habilita a publicarse para la flota.

Mercado Pago funciona con Checkout Pro a través del SDK oficial: creamos una
preferencia, devolvemos el `init_point` con su QR y confirmamos por webhook o por
consulta. El webhook no confía en el aviso que llega: vuelve a pedirle el pago a
Mercado Pago para verificar el estado antes de aprobar. Para activarlo hace falta
`MP_ACCESS_TOKEN` y `PUBLIC_API_URL` apuntando a una URL que Mercado Pago pueda
alcanzar (en producción, la de Render).

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
