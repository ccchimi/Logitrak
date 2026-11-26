# Pendientes de Logitrak
Lista de tareas pendientes y limitaciones conocidas. Lo que ya está implementado
y verificado se saca de acá; el historial queda en los commits.

Otros documentos con pendientes de un tema puntual:

- [Integraciones](integraciones.md): qué es real, qué está simulado y qué
  configuración tiene que cargar el equipo en cada servicio.
- [Política de datos](politica-de-datos.md#pendiente): datos personales.
- [Conclusiones de QA](qa/conclusiones-qa.md#4-qué-haríamos-distinto) y
  [plan de mantenimiento](qa/plan-de-mantenimiento.md#4-estado-de-implementación):
  protección de la rama principal, análisis estático bloqueante en la CI,
  pruebas de carga y tiempo de carga en el celular.
- [Pruebas de usabilidad](qa/pruebas-de-usabilidad.md#4-backlog): los cuatro
  tickets que salieron de las sesiones con usuarios.
- Sección de limitaciones de cada README ([raíz](../README.md),
  [backend](../backend/README.md), [frontend](../frontend/README.md)).
- [Roadmap](ROADMAP.md): ideas a futuro, no pendientes.

1. Reembolsos reales de Mercado Pago sin verificar. El pago de punta a punta ya
   funciona (probado desde mobile con el usuario comprador). El reembolso no se
   pudo probar: las cuentas de prueba no tienen permitido reembolsar y la API
   devuelve 401 "Unauthorized use of live credentials". El código lo maneja como
   falla permanente —cancela el envío pero no marca el dinero como devuelto— y
   `MP_REEMBOLSOS_SIMULADOS=true` permite ejercitar el flujo completo en pruebas.
   Queda verificarlo recién con credenciales productivas.
2. Confirmar un email o teléfono nuevo con un código antes de guardarlo. Hoy
   se cambian con la contraseña, sin confirmación; hace falta un proveedor de
   correo o SMS (el mismo del punto de los mails).
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
   líneas; hoy hay 94 %). Mercado Pago y MODO se prueban con las pasarelas
   simuladas; lo que sigue más flojo son los adjuntos de soporte con Storage.
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
12. La exportación de datos no adjunta las fotos (verificación, entrega,
    chat y soporte); solo indica cuáles existen.
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
18. GPS del chofer en segundo plano: el código está, pero hay que probarlo en
    el build nuevo de Android (no funciona en Expo Go) y declarar el uso de
    la ubicación en segundo plano para Play Store. También falta confirmar en
    producción que la política de Realtime de
    `ubicaciones_chofer` entrega las posiciones al cliente (localmente se
    probó con la consulta de respaldo).
19. Chat del envío: confirmar en producción que la política de Realtime de
    `envio_mensajes` entrega los mensajes (localmente se probó con la consulta
    de respaldo) y probar en el teléfono la cámara para mandar fotos.
20. Cargar `GOOGLE_DIRECTIONS_KEY` en Render. Sin esa clave, `/api/salud`
    muestra `googleDirections: no_configurado` y las distancias de la
    cotización y el recorrido se estiman en línea recta. Es la observación del
    Parcial 2 sobre la precisión de las distancias. Después aplicarle las
    restricciones del punto 8.
21. Activar MODO: pedir las credenciales (`MODO_CLIENT_ID`,
    `MODO_CLIENT_SECRET`, `MODO_STORE_ID`) y cargarlas en Render. Sin ellas
    `/api/salud` muestra `modo: no_configurado` y la app no ofrece MODO.
22. Tarjetas guardadas y cuenta de cobro del chofer: las pantallas
    (`MetodosScreen`) existen pero avisan que no guardan datos. El pago al
    chofer se calcula en cada oferta, pero la app no se lo transfiere; hace
    falta definir cómo cobra (proveedor y cuenta) antes de operar en serio.
23. Validación de identidad con RENAPER: no está implementada (`llamarApiReal`
    lanza un error). Hoy se compara el PDF417 del DNI con el nombre ingresado y
    la selfie; hace falta un convenio o proveedor para la validación oficial.
24. Revisar si alguien usó la recuperación de contraseña vieja. Hasta el
    26/11/2026, `POST /api/auth/recuperar` cambiaba la contraseña de cualquier
    cliente o chofer con solo su usuario. Se puede ver en `auditoria_accesos`
    de producción: los ingresos de una cuenta desde una IP nueva después de un
    cambio así. Necesita acceso a la base de producción.
25. Recuperación de contraseña por mail: hoy la resuelve soporte con una
    contraseña temporal. Con un proveedor de correo (punto 17) y el email
    confirmado (punto 2) puede pasar a un link de un solo uso.
26. La app de Android instalada usa el formato viejo del pedido de
    recuperación: al pedirla muestra "Dejanos un email o un teléfono…" y no
    puede completarla. Se resuelve con el build nuevo del punto 13.
