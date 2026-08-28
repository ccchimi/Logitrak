# Pendientes de Logitrak
Lista de tareas pendientes y limitaciones conocidas. Lo que ya está implementado
y verificado se saca de acá; el historial queda en los commits.

1. Pago real de Mercado Pago de punta a punta. La integración está completa y las
   credenciales del test user vendedor ya están validadas contra la API (crear
   preferencia y buscar pagos responden OK). Falta cargar `MP_ACCESS_TOKEN` en
   Render y hacer una compra de prueba con el usuario comprador para confirmar
   que el envío pasa a `pagado`.
2. Handoff por QR para la verificación de DNI: generar un QR en desktop,
   continuar el escaneo en el teléfono y mostrar el resultado en tiempo real en
   el desktop. Se apoya en Supabase Realtime, que entra en el plan Free.
3. Compensación por SLA automatizada del lado del servidor. Hoy el cupón se
   dispara desde la app. Puede reusar el patrón de expiración perezosa que ya
   está en `backend/src/servicios/envios/expiracion.js`.
4. Que el admin pueda editar los perfiles de otros usuarios. Hoy cada rol edita
   solo el suyo; falta una pantalla de listado de usuarios.
5. Seguimiento en tiempo real por push con Supabase Realtime, en lugar del
   polling actual. Mejora de escalabilidad y también entra en el plan Free.
6. Suite de tests automatizados. Hoy no hay tests propios. La expiración de
   ofertas y el reembolso son los primeros candidatos: se probaron a mano contra
   la base, pero no quedó test que lo cubra.
7. Validar la firma del webhook de Mercado Pago con la clave secreta del panel.
   Hoy no se valida, pero no es explotable: antes de aprobar, el backend
   reconsulta el pago contra la API de MP, así que una notificación falsa no
   alcanza para marcar un envío como pagado. El SDK ya trae
   `WebhookSignatureValidator`. Suma en "Calidad de integración".
8. Backend en Render plan Free: el spin-down por inactividad afecta los webhooks
   de pago. Para producción, plan pago o keep-alive. Mitigado en parte por el
   fallback de polling por `external_reference`.
9. Restringir las claves de Google Maps por package name y SHA-1. Hoy quedan
   embebidas en el bundle sin restricción.
10. Verificación de identidad tiers 2 y 3 (liveness y match facial). Funcionan
    solo con dev build, no en Expo Go ni web. Se activan por variable de entorno.