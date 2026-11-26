# 1. Requerimientos funcionales

Requerimientos funcionales definidos en el Parcial 1, con el estado en que quedaron en el sistema. El detalle de dónde se implementa y qué pruebas cubren cada uno está en el [documento de trazabilidad](10-trazabilidad.md).

## 1.1 Requerimientos del diseño

| Código | Categoría | Descripción (Parcial 1) | Estado | Cómo quedó implementado |
|---|---|---|---|---|
| RF01 | Autenticación | El sistema deberá permitir el inicio de sesión de usuarios. | Cumplido | Usuario y contraseña con sesión renovable y revocable, verificación en dos pasos para el equipo y recuperación a cargo de soporte con contraseña temporal. |
| RF02 | Usuarios | El sistema deberá permitir gestionar el perfil de usuario. | Cumplido | Mi Perfil: nombre, email, teléfono y contraseña (siempre con la contraseña actual), preferencias, descarga de los datos y eliminación de la cuenta. |
| RF03 | Envíos | El sistema deberá permitir solicitar envíos. | Cumplido | El cliente cotiza con Boxy y confirma el envío desde la cotización. |
| RF04 | IA | El sistema deberá ofrecer recomendaciones de pedido mediante Boxy (IA). | Cumplido con cambio | Boxy es un motor de reglas con procesamiento de lenguaje: entiende direcciones, pesos y respuestas, clasifica la carga y elige el vehículo. Se descartó un modelo de IA porque el precio tiene que ser explicable y reproducible. |
| RF05 | Cotización | El sistema deberá calcular el costo de entrega de forma automática. | Cumplido | Precio desglosado según distancia, peso, volumen, vehículo, tipo de carga, demanda y peajes. El servidor lo recalcula con el mismo código. |
| RF06 | Pagos | El sistema deberá permitir realizar pagos mediante Mercado Pago. | Cumplido | Mercado Pago (checkout, QR y aviso firmado), MODO y tarjeta, con reembolsos. Hoy con credenciales de prueba: no hay cobros reales. |
| RF07 | Seguimiento | El sistema deberá generar códigos de seguimiento automáticamente. | Cumplido | Cada envío recibe un código `TRK-AAAA-NNNNNN`. |
| RF08 | Envíos | El sistema deberá permitir consultar envíos activos. | Cumplido | Panel del cliente con sus envíos, filtros por estado y búsqueda. |
| RF09 | Envíos | El sistema deberá permitir cancelar envíos desde la app. | Cumplido | El cliente cancela mientras ningún chofer lo tomó; si estaba pago, se devuelve el importe. |
| RF10 | Asignación | El sistema deberá asignar transportes y conductores automáticamente mediante IA. | Cumplido con cambio | El envío pago se ofrece a los choferes con vehículo compatible y lo toma el primero que acepta; si nadie lo toma en 5 minutos, se cancela y se reembolsa. |
| RF11 | Seguimiento | El sistema deberá permitir el seguimiento del envío en tiempo real. | Cumplido | Estados, hitos y ubicación del chofer en el mapa, actualizados en tiempo real. |
| RF12 | Historial | El sistema deberá almacenar el historial de envíos. | Cumplido | Historial paginado con búsqueda, totales y cumplimiento del plazo. |
| RF13 | Comunicación | El sistema deberá permitir la comunicación entre cliente y conductor. | Cumplido | Chat del envío con texto y fotos mientras dura el viaje. |
| RF14 | Notificaciones | El sistema deberá enviar notificaciones por email con comprobantes. | Parcial | El comprobante se descarga en PDF desde la app. Falta el proveedor de correo para mandarlo por mail. |
| RF15 | Notificaciones | El sistema deberá mostrar notificaciones visuales ante acciones importantes. | Cumplido | Avisos en pantalla, bandeja de notificaciones y push en el teléfono (Android). |
| RF16 | Valoraciones | El sistema deberá permitir calificar el servicio y al conductor. | Cumplido | Con el envío entregado, el cliente califica al chofer de 1 a 5 estrellas con un comentario opcional. |
| RF17 | Administración | El sistema deberá contar con un panel de administración. | Cumplido | Panel con métricas, pedidos, usuarios, devoluciones y soporte, con roles admin y soporte. |

**Resumen:** 14 cumplidos, 2 cumplidos con un cambio de diseño justificado (RF04 y RF10) y 1 parcial (RF14).

## 1.2 Requerimientos agregados durante el desarrollo

Surgieron al implementar, a partir de pruebas, hallazgos de seguridad o la Ley 25.326 de Protección de Datos Personales:

| Requerimiento | Motivo |
|---|---|
| Módulo de soporte con consultas, chat y asistente | Atender reclamos sin salir de la app |
| Rol soporte, con permisos distintos de los del administrador | Que quien atiende consultas no pueda mover dinero ni cambiar roles |
| Entrega con el PIN de quien recibe y una foto de comprobante | Antes un envío podía marcarse como entregado sin pruebas |
| Verificación en dos pasos para las cuentas del equipo | Proteger las cuentas con más permisos |
| Descarga de los datos de la cuenta y eliminación con anonimización | Derechos de acceso y de supresión (Ley 25.326) |
| Plazos de conservación de fotos y datos de ingreso | Observación del Parcial 2 sobre datos personales ([política de datos](../politica-de-datos.md)) |
| Devolución automática de cobros duplicados | Un segundo cobro del mismo envío antes solo se avisaba |
| Vencimiento de los pedidos sin pagar a los 5 minutos | Evitar pedidos pendientes para siempre |
