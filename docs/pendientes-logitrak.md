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
2. Reintentos de pago sobre el mismo envío: hoy cada intento crea un pago y una
   preferencia nuevos, así que un envío puede terminar con dos pagos aprobados.
   Pasó con `TRK-2026-000002`. Convendría reusar la preferencia pendiente en vez
   de emitir otra.
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
7. Suite de tests automatizados. Hoy no hay tests propios. La expiración de
   ofertas y el reembolso son los primeros candidatos: se probaron a mano contra
   la base, pero no quedó test que lo cubra.
8. Validar la firma del webhook de Mercado Pago con la clave secreta del panel.
   Hoy no se valida, pero no es explotable: antes de aprobar, el backend
   reconsulta el pago contra la API de MP, así que una notificación falsa no
   alcanza para marcar un envío como pagado. El SDK ya trae
   `WebhookSignatureValidator`. Suma en "Calidad de integración".
9. Backend en Render plan Free: el spin-down por inactividad afecta los webhooks
   de pago. Para producción, plan pago o keep-alive. Mitigado en parte por el
   fallback de polling por `external_reference`.
10. Restringir las claves de Google Maps por package name y SHA-1. Hoy quedan
   embebidas en el bundle sin restricción.
11. Verificación de identidad tiers 2 y 3 (liveness y match facial). Funcionan
    solo con dev build, no en Expo Go ni web. Se activan por variable de entorno.