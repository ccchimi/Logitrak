# Pendientes de Logitrak
Lista de tareas pendientes y limitaciones conocidas. Lo que ya está implementado
y verificado se saca de acá; el historial queda en los commits.

1. Reembolsos reales de Mercado Pago sin verificar. El pago de punta a punta ya
   funciona (probado desde mobile con el usuario comprador). El reembolso no se
   pudo probar: las cuentas de prueba no tienen permitido reembolsar y la API
   devuelve 401 "Unauthorized use of live credentials". El código lo maneja como
   falla permanente —cancela el envío pero no marca el dinero como devuelto— y
   `MP_REEMBOLSOS_SIMULADOS=true` permite ejercitar el flujo completo en pruebas.
   Queda verificarlo recién con credenciales productivas.
2. Devolución de cobros reales que no son de Mercado Pago. Los cobros de más
   se devuelven solos, pero solo Mercado Pago tiene devolución por API: un
   cobro real de MODO queda "en revisión" y se avisa a los admins para
   devolverlo desde su panel. Falta un botón en el panel del admin para
   marcar esas devoluciones como hechas.
3. Handoff por QR para la verificación de DNI: generar un QR en desktop,
   continuar el escaneo en el teléfono y mostrar el resultado en tiempo real en
   el desktop. Se apoya en Supabase Realtime, que entra en el plan Free.
4. Push en iOS. Realtime y push en Android ya funcionan en producción
   (Storage, Realtime y FCM configurados; push probado en un teléfono real con
   el build de desarrollo). Para iOS falta una cuenta de Apple Developer y las
   credenciales de APNs en EAS. Para publicar en Play Store, generar el build
   `production` y, si se quiere el mapa en el build, cargar
   `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` como variable de EAS.
5. Más tests del backend. Todas las rutas tienen pruebas de integración con
   `supertest` contra PostgreSQL, y la CI exige cobertura mínima (85 % de
   líneas; hoy hay 90,9 %). Lo que sigue más flojo es `pagos.js` con Mercado
   Pago y MODO reales (hoy se prueba el camino sandbox) y los adjuntos de
   soporte con Storage.
6. Verificar la firma del webhook con notificaciones reales de Mercado Pago.
   El backend ya exige la firma (`MP_WEBHOOK_SECRET`) y está probado con
   vectores calculados aparte, pero falta confirmar en Render que los avisos que
   llegan por el `notification_url` de las preferencias traen `x-signature`. Si
   no la trajeran, se rechazan con 401 y el pago se confirma igual por consulta.
7. Backend en Render plan Free: el spin-down por inactividad afecta los webhooks
   de pago. Para producción, plan pago o keep-alive. Mitigado en parte por el
   fallback de polling por `external_reference`.
8. Aplicar las restricciones de las claves de Google en la Cloud Console (no
    se puede hacer desde el código). Desde el Hito 0.6 la ruta del móvil la
    calcula el backend, así que la clave de Directions ya no viaja en la app.
    Falta: restringir la de Android a `com.logitrak.frontend` + SHA-1 y solo
    Maps SDK for Android; la web a `https://ccchimi.github.io/*` y solo Maps
    JavaScript y Directions; la del servidor (`GOOGLE_DIRECTIONS_KEY` en Render)
    solo a Directions. Después, rotar la clave de Directions vieja, que estuvo
    expuesta en versiones anteriores de la app, y borrar el secret
    `EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY` del repo.
9. Verificación de identidad tiers 2 y 3 (liveness y match facial). Funcionan
    solo con dev build, no en Expo Go ni web. Se activan por variable de entorno.
10. Sesión en la web: el refresh token queda en localStorage, protegido por
    la rotación y la detección de reuso. Lo más seguro sería una cookie
    `HttpOnly`, que necesita servir la Web App y la API desde el mismo dominio.
11. Quitar el token largo de compatibilidad (`JWT_EXPIRA`) cuando ya nadie use
    versiones de la app anteriores al Hito 0.4.
12. Un trabajo periódico que borre del Storage los archivos que hayan quedado
    si la eliminación de una cuenta no pudo borrarlos en el momento (hoy solo
    se registra en el log). La exportación de datos tampoco adjunta las fotos.
13. Builds nativos después del salto a Expo SDK 58. La app pasó de SDK 54 a
    58 de a una versión (React Native 0.88, New Architecture obligatoria). Falta
    generar un build de desarrollo nuevo de Android, porque el instalado es de
    SDK 54, y probar en el teléfono la cámara, el mapa y la prueba de vida con
    `@react-native-ml-kit/face-detection`, que no figura como probada con la New
    Architecture. Ese build también tiene que incluir `expo-secure-store` para
    que la sesión pase al llavero del teléfono, y en él hay que probar que el
    chofer comparte su GPS y el cliente lo ve moverse. Quedan 6
    vulnerabilidades moderadas en herramientas de build (`glob`, `minimatch`),
    ninguna en el código que llega al teléfono.
14. Contraseñas de los admins de producción. El código ya no siembra admins
    con contraseña conocida: si la base no tiene ninguno, crea el primero con
    `ADMIN_INICIAL_USUARIO` y `ADMIN_INICIAL_CONTRASENA`. Las cuentas que ya
    existen no cambian: si alguna tiene la contraseña igual al usuario, el log
    de Render lo avisa al arrancar ("Hay administradores con la contraseña
    igual al usuario"). Cada admin tiene que cambiarla desde Mi Perfil.
15. Activar Sentry: crear en sentry.io un proyecto de Node y uno de React
    Native (el plan gratis alcanza), cargar `SENTRY_DSN` en Render y
    `EXPO_PUBLIC_SENTRY_DSN` en el `.env` de la app y como variable del repo
    (Settings > Secrets and variables > Actions > Variables) para la Web App.
    Para ver los errores del móvil con el código original hay que agregar
    `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` como secretos de EAS.
16. Configurar en Render el health check del servicio en `/api/salud/vivo`
    (Settings > Health Check Path) y, si se arma staging, crear un segundo
    servicio con `ENTORNO=staging` y su propia base y credenciales.
17. Mails: para mandar las notificaciones y el comprobante del envío también
    por mail haría falta guardar el email de los clientes, que hoy no se pide,
    y un proveedor de correo (por ejemplo, Resend). La bandeja en la app, el
    push y el comprobante en PDF descargable ya están.
18. GPS del chofer en segundo plano. Hoy la ubicación se comparte solo con la
    app abierta. Para seguir compartiéndola con la app minimizada hace falta
    el permiso de ubicación en segundo plano, `expo-task-manager`, la
    notificación persistente de Android y un build nuevo. También falta
    confirmar en producción que la política de Realtime de
    `ubicaciones_chofer` entrega las posiciones al cliente (localmente se
    probó con la consulta de respaldo).
19. Chat del envío: confirmar en producción que la política de Realtime de
    `envio_mensajes` entrega los mensajes (localmente se probó con la consulta
    de respaldo) y probar en el teléfono la cámara para mandar fotos.
