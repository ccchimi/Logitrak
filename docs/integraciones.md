# Integraciones: qué es real, qué es simulado y qué falta configurar

Respuesta a la observación del Parcial 2: *"diferenciar claramente las integraciones reales de aquellas que actualmente se encuentran simuladas o pendientes de verificación"*. Estado verificado el 25/11/2026 contra el código y contra `GET https://logitrak.onrender.com/api/salud` (producción).

**Cómo leer la tabla.** *Real* quiere decir que el código llama al servicio externo verdadero. *Con credenciales de prueba* quiere decir que lo llama, pero con una cuenta de prueba: no hay plata ni datos reales en juego. *Simulado* quiere decir que no hay servicio externo detrás. *Pendiente* quiere decir que el código existe pero no está activo o no se pudo verificar.

## Estado de cada integración

| Integración | Para qué se usa | Estado en producción | Evidencia y límites |
|---|---|---|---|
| **PostgreSQL (Supabase)** | Base de datos de todo el sistema | Real | `/api/salud`: `baseDeDatos: ok`, sin migraciones pendientes. |
| **Supabase Storage** | DNI, selfies, fotos de entrega y del chat, adjuntos de soporte | Real (bucket privado, links firmados de 5 minutos; 10 en el chat y en soporte) | `/api/salud`: `almacenamiento: ok`. |
| **Supabase Realtime** | Seguimiento del envío, chat, soporte, ubicación del chofer | Real | Probado en Android. Falta confirmar en producción las políticas de lectura del chat (`envio_mensajes`, pendiente #19) y de la ubicación del chofer (`ubicaciones_chofer`). |
| **Mercado Pago** | Checkout, QR, confirmación del pago y webhook | Real, **con credenciales de prueba** | `/api/salud`: `mercadoPago: ok`. Pago de punta a punta probado desde el teléfono con el usuario comprador de prueba. **No hay cobros reales.** |
| **Mercado Pago: reembolsos** | Devolver el importe si nadie toma el envío o si se cobró dos veces | **Pendiente de verificar** | Las cuentas de prueba no pueden reembolsar (401). El código lo trata como falla permanente y el admin registra la devolución manual. Se verifica recién con credenciales productivas (pendiente #1). |
| **Mercado Pago: webhook firmado** | Confirmar pagos por notificación | Real, **firma sin verificar con avisos reales** | El backend exige `MP_WEBHOOK_SECRET` y está probado con vectores calculados aparte. Si un aviso no trae firma se rechaza y el pago se confirma igual por consulta (pendiente #6). El plan gratuito de Render se duerme y puede demorar avisos (pendiente #7). |
| **MODO** | Pago con billeteras bancarias | **Simulado** (`modo: no_configurado`) | El código de la integración real existe y está probado contra una pasarela falsa. Sin credenciales, la app no ofrece MODO como método (pendiente #21). |
| **Tarjeta cargada en Logitrak** | Pago con tarjeta dentro de la app | **Simulado** | No hay procesador bancario: valida los datos y devuelve un resultado de prueba. Nunca cargar tarjetas reales. Para cobrar de verdad hace falta un proveedor que tokenice la tarjeta del lado del cliente (pendiente #22). |
| **Google Maps** (web y Android) | Mapa del seguimiento | Real | Claves públicas de la app. Falta restringirlas por dominio, paquete y API (pendiente #8). |
| **Google Directions** (desde el backend) | Recorrido por calle en el mapa del teléfono (`GET /api/recorridos`) | **Pendiente** (`googleDirections: no_configurado`) | El código está, pero sin `GOOGLE_DIRECTIONS_KEY` el mapa muestra solo los puntos de retiro y entrega (pendiente #20). La **distancia de la cotización no usa Directions**: se estima en línea recta entre localidades, también en el servidor. Esa es la observación del profe sobre la precisión de las distancias y necesita código, no solo la clave (pendiente #27). |
| **Notificaciones push** (Expo + FCM) | Avisos en el teléfono | Real en Android | Probado en un teléfono real. En iOS falta la cuenta de Apple Developer y las credenciales de APNs (pendiente #4). |
| **RENAPER** | Validación oficial de identidad | **No implementado** | `llamarApiReal` lanza un error. Hoy la verificación compara los datos del código PDF417 del DNI con el nombre ingresado y el resultado de la selfie; no es una validación oficial (pendiente #23). |
| **Prueba de vida (ML Kit)** | Detectar que la selfie es de una persona presente | Real solo en builds nativos | No funciona en web ni en Expo Go (pendiente #9). |
| **Comparación facial** (`faceMatch.js`) | Comparar la selfie con la foto del DNI | **Pendiente** | Requiere `@tensorflow/tfjs-node` y los modelos, que no están instalados en el servidor, así que hoy la comparación no corre y la postulación sigue sin ella. `FACE_MATCH_REQUERIDO=true` solo rechaza cuando la comparación se hace y las caras no coinciden. |
| **Sentry** | Reporte de errores | **Pendiente** (`sentry: no_configurado`) | El código lo soporta; falta crear los proyectos (pendiente #15). |
| **Correo electrónico** | Comprobante por mail, recuperación de contraseña por link, confirmar email | **No implementado** | No hay proveedor de correo. Mientras tanto, la recuperación de contraseña la resuelve soporte con una contraseña temporal. El comprobante se descarga desde la app (pendiente #17). |
| **Render, GitHub Pages y EAS** | Despliegue de la API, la Web App y la app Android | Real | La versión desplegada se ve en `/api/salud` (`version`). |

## Claves y configuraciones que tiene que cargar el equipo

Estas tareas se hacen en los paneles de cada servicio: no se pueden resolver desde el código.

| Dónde | Qué hacer | Para qué |
|---|---|---|
| Render → Environment | Cargar `GOOGLE_DIRECTIONS_KEY` | Ruta por calles en el mapa del teléfono, y requisito para la distancia por calle en la cotización (pendiente #27). |
| Google Cloud Console | Restringir la clave de Android a `com.logitrak.frontend` + SHA-1 y solo Maps SDK for Android; la web a `https://ccchimi.github.io/*` y solo Maps JavaScript; la del servidor solo a Directions. Rotar la clave de Directions vieja. | Que nadie pueda usar las claves desde otro sitio o app. |
| sentry.io + Render + GitHub | Crear un proyecto de Node y uno de React Native; cargar `SENTRY_DSN` en Render y `EXPO_PUBLIC_SENTRY_DSN` en GitHub Actions y EAS | Ver los errores de usuarios reales. |
| Render → Health check | Configurar `/api/salud/vivo` | Que Render reinicie la API si se cuelga. |
| Mercado Pago | Pasar a credenciales productivas cuando se quiera cobrar de verdad y probar un reembolso y un webhook firmado | Cerrar los pendientes #1 y #6. |
| MODO | Pedir credenciales (`MODO_CLIENT_ID`, `MODO_CLIENT_SECRET`, `MODO_STORE_ID`) | Activar el pago con MODO. |
| Producción (Mi Perfil) | Cambiar la contraseña de los admins creados antes del cambio de seguridad | El log de arranque avisa si alguna es igual al usuario. |
| Proveedor de correo (por ejemplo, Resend o SendGrid) | Crear la cuenta y definir el remitente | Comprobante por mail, recuperación segura y confirmación de email. |
