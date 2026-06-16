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
esquema (`src/db/schema.sql`) y siembra los 3 administradores. La API queda en
`http://localhost:4000`.

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
| GET    | `/api/perfil/resumen`             | Resumen de la cuenta para la pantalla de Perfil      |

## Roles

- **admin**: no se puede crear desde la app; se siembran 3 por sistema en `src/db/init.js`.
- **cliente**: todo el que se registra.
- **chofer**: un cliente que completó la postulación ("Trabajá con nosotros") y
  pasó la verificación de identidad. Recibe un ID público único (p. ej. `CH-7F3K9Q`),
  que es lo único que ve el cliente junto a su nombre completo.

## RENAPER

Aun sin buildear.

## Seguridad implementada

- Contraseñas hasheadas con bcrypt (nunca en texto plano).
- Sesiones con JWT firmado (expiración configurable, `JWT_EXPIRA`).
- Rate limiting en login/recuperación (10 intentos por IP cada 15 min).
- Auditoría de todos los intentos de acceso en `auditoria_accesos` (IP, user-agent, resultado).
- Las cuentas admin no se registran ni se restablecen desde la app.
- Consultas SQL siempre parametrizadas (sin concatenación de strings).
- Alta de chofer transaccional (rol + ficha cambian juntos o no cambia nada).