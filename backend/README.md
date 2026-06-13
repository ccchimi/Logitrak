# LogiTrack — Backend

API en Node.js + Express sobre PostgreSQL. Maneja autenticación con roles
(`admin`, `cliente`, `chofer`), postulación a chofer con verificación de
identidad y auditoría de accesos.

## Requisitos

- Node.js 20+
- PostgreSQL corriendo en `localhost:5432` (instalado como servicio de Windows)

## Cómo correrlo

```bash
cd backend
npm install
npm run dev      # con recarga automática (o: npm start)
```

Al arrancar, el servidor crea la base `logitrack` si no existe, aplica el
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
| Database | `logitrack` |

URL JDBC: `jdbc:postgresql://localhost:5432/logitrack`

## Endpoints

| Método | Ruta                        | Descripción                                          |
|--------|-----------------------------|------------------------------------------------------|
| GET    | `/api/salud`                | Estado del servidor y la base                        |
| POST   | `/api/auth/login`           | Inicia sesión, devuelve token + rol                  |
| POST   | `/api/auth/registro`        | Crea una cuenta (siempre rol `cliente`)              |
| GET    | `/api/auth/existe/:usuario` | Indica si existe un usuario                          |
| POST   | `/api/auth/recuperar`       | Restablece contraseña (no permitido para admins)     |
| GET    | `/api/auth/perfil`          | Datos del usuario logueado (requiere token)          |
| POST   | `/api/choferes/postulacion` | Postula a un cliente como chofer (requiere token)    |

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