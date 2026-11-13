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
2. Reembolsar los pagos marcados como duplicados. Desde el Hito 0.1 ya no se
   crean pagos duplicados por reintentos, pero si dos cobros llegan a aprobarse
   para el mismo envío (por ejemplo, un QR viejo pagado tarde), el segundo queda
   con `detalle.duplicadoDe` y `detalle.reembolsoPendiente`. Falta devolverlo
   automáticamente o desde el panel del admin. `TRK-2026-000002` es anterior y
   hay que revisarlo a mano.
3. Handoff por QR para la verificación de DNI: generar un QR en desktop,
   continuar el escaneo en el teléfono y mostrar el resultado en tiempo real en
   el desktop. Se apoya en Supabase Realtime, que entra en el plan Free.
4. Compensación por SLA automatizada del lado del servidor. Hoy el cupón se
   dispara desde la app. Puede reusar el patrón de expiración perezosa que ya
   está en `backend/src/servicios/envios/expiracion.js`.
5. Que el admin pueda editar los perfiles de otros usuarios. Hoy cada rol edita
   solo el suyo; falta una pantalla de listado de usuarios.
6. Seguimiento de envíos en tiempo real por push, en lugar del polling actual.
   El chat de soporte ya funciona así y dejó el camino hecho: JWT propio firmado
   por el backend, políticas RLS de solo lectura y `REPLICA IDENTITY FULL`. Falta
   aplicar el mismo patrón a `envios` y `envio_eventos`.
7. Más tests del backend. Ya hay pruebas del cálculo de precio en el servidor
   (`npm test` en `backend/`, corren en la CI), pero las rutas no tienen tests
   contra la base. La expiración de ofertas y el reembolso son los primeros
   candidatos: se probaron a mano contra la base, pero no quedó test que lo cubra.
8. Verificar la firma del webhook con notificaciones reales de Mercado Pago.
   El backend ya exige la firma (`MP_WEBHOOK_SECRET`) y está probado con
   vectores calculados aparte, pero falta confirmar en Render que los avisos que
   llegan por el `notification_url` de las preferencias traen `x-signature`. Si
   no la trajeran, se rechazan con 401 y el pago se confirma igual por consulta.
9. Backend en Render plan Free: el spin-down por inactividad afecta los webhooks
   de pago. Para producción, plan pago o keep-alive. Mitigado en parte por el
   fallback de polling por `external_reference`.
10. Aplicar las restricciones de las claves de Google en la Cloud Console (no
    se puede hacer desde el código). Desde el Hito 0.6 la ruta del móvil la
    calcula el backend, así que la clave de Directions ya no viaja en la app.
    Falta: restringir la de Android a `com.logitrak.frontend` + SHA-1 y solo
    Maps SDK for Android; la web a `https://ccchimi.github.io/*` y solo Maps
    JavaScript y Directions; la del servidor (`GOOGLE_DIRECTIONS_KEY` en Render)
    solo a Directions. Después, rotar la clave de Directions vieja, que estuvo
    expuesta en versiones anteriores de la app, y borrar el secret
    `EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY` del repo.
11. Verificación de identidad tiers 2 y 3 (liveness y match facial). Funcionan
    solo con dev build, no en Expo Go ni web. Se activan por variable de entorno.
12. Guardar el refresh token en el almacenamiento seguro del teléfono
    (`expo-secure-store`) en lugar de AsyncStorage. En web no hay equivalente:
    queda en localStorage, protegido por la rotación y la detección de reuso.
13. Quitar el token largo de compatibilidad (`JWT_EXPIRA`) cuando ya nadie use
    versiones de la app anteriores al Hito 0.4.
14. Exportar los datos de la cuenta (derecho de acceso de la Ley 25.326). La
    eliminación ya está (Hito 0.5); falta que el usuario pueda descargar lo que
    tenemos guardado de él. Y un trabajo periódico que borre del Storage los
    archivos que hayan quedado si la eliminación no pudo borrarlos en el momento
    (hoy solo se registra en el log).
15. Actualizar Expo de SDK 54 a la versión vigente. En el Hito 0.6 quedaron
    corregidas todas las vulnerabilidades críticas y las del backend; las 21
    restantes del frontend (1 alta) están en las herramientas de build de Expo
    (`@expo/cli`, metro, `image-size`), no en el código que llega al teléfono, y
    su arreglo exige el salto de SDK. Conviene hacerlo de a una versión, con
    `npx expo install --fix`, probando el mapa, la cámara y la detección facial.
16. Admins sembrados con contraseña igual al usuario. `src/db/init.js` crea
    `ccchimi`, `melirm` y `claukev` con la contraseña igual al nombre si no
    existen (no pisa una contraseña ya cambiada). Hay que confirmar que en
    producción se cambiaron y pasar la contraseña inicial a una variable de
    entorno, o crear los admins con una migración sin contraseña conocida.
17. Activar Sentry: crear en sentry.io un proyecto de Node y uno de React
    Native (el plan gratis alcanza), cargar `SENTRY_DSN` en Render y
    `EXPO_PUBLIC_SENTRY_DSN` en el `.env` de la app y como variable del repo
    (Settings > Secrets and variables > Actions > Variables) para la Web App.
    Para ver los errores del móvil con el código original hay que agregar
    `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` como secretos de EAS.
18. Configurar en Render el health check del servicio en `/api/salud/vivo`
    (Settings > Health Check Path) y, si se arma staging, crear un segundo
    servicio con `ENTORNO=staging` y su propia base y credenciales.
