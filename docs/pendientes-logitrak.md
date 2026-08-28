# Pendientes de Logitrak

Lista de tareas pendientes y limitaciones conocidas al cierre de la sesión.

1. Pagos reales de Mercado Pago: el código de back y front está terminado. Falta cargar el Access Token de prueba en `MP_ACCESS_TOKEN` (local y Render), crear un usuario de prueba comprador y probar contra Render.

2. Timeout, cancelación y reembolso de los envíos que ningún chofer toma en 5 minutos. El modelo elegido es cancelar y reembolsar con expiración perezosa, no pre-cobro.

3. Visibilidad en el dashboard del cliente: que el envío aparezca recién cuando un chofer lo toma, no mientras está pago y pendiente. Va junto con el punto 2.

4. Handoff por QR para la verificación de DNI: generar un QR en desktop, continuar el escaneo en el teléfono y mostrar el resultado en tiempo real en el desktop. Se apoya en Supabase Realtime.

5. Compensación por SLA automatizada del lado del servidor. Hoy el cupón se dispara desde la app; necesita el mismo patrón de expiración perezosa que el punto 2.

6. Que el admin pueda editar los perfiles de otros usuarios. Hoy cada rol edita solo el suyo; falta una pantalla de listado de usuarios.

7. Seguimiento en tiempo real por push con Supabase Realtime, en lugar del polling actual. Mejora de escalabilidad.

8. Suite de tests automatizados. Hoy no hay tests propios.

9. Fallback de polling de Mercado Pago sin webhook, buscando el pago por `external_reference`. Robustez extra para la demo.

10. Integración directa con MODO. Bloqueada por convenio de comercio. Queda a futuro; el QR interoperable ya cubre a los usuarios de MODO.

11. Pago con tarjeta real. Requiere certificación PCI-DSS y un adquirente. Fuera de alcance, hoy simulado.

12. Backend en Render plan Free: el spin-down por inactividad afecta los webhooks de pago. Para producción, plan pago o keep-alive.

13. Restringir las claves de Google Maps por package name y SHA-1. Hoy quedan embebidas en el bundle sin restricción.

14. Verificación de identidad tiers 2 y 3 (liveness y match facial). Funcionan solo con dev build, no en Expo Go ni web. Se activan por variable de entorno.
