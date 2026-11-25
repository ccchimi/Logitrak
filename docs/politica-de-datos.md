# Política de tratamiento, conservación y eliminación de datos personales

Respuesta a la observación del Parcial 2: *"profundizar las políticas de tratamiento, conservación y eliminación de información personal, especialmente los documentos de identidad, las fotografías faciales y los datos de geolocalización"*. Describe lo que hace el sistema hoy (25/11/2026), no una intención: cada punto remite al código que lo cumple. El marco es la Ley 25.326 de Protección de Datos Personales; este documento no certifica su cumplimiento legal.

## Principios

- **Mínimo necesario:** se pide cada dato solo para la función que lo usa. Por ejemplo, la postulación rechazada no guarda las fotos: solo se suben si la verificación se aprueba (`rutas/choferes.js`).
- **Acceso por permiso, no por pantalla:** el backend comprueba el permiso en cada pedido (`middleware/permisos.js`) y las políticas RLS limitan lo que cada usuario lee en tiempo real.
- **Archivos privados:** las fotos están en un bucket privado y se muestran con links firmados que vencen a los 5 minutos.
- **Plazos automáticos:** lo que no hace falta conservar se borra solo (`servicios/retencion.js`, trabajo diario `aplicar-retencion`).
- **Derechos del titular:** el usuario descarga todos sus datos (`POST /api/perfil/exportar`, derecho de acceso) y puede eliminar su cuenta (`POST /api/perfil/eliminar-cuenta`, derecho de supresión).

## Qué dato, quién lo ve y cuánto se conserva

| Dato | Para qué | Quién accede | Conservación y eliminación |
|---|---|---|---|
| **Foto del DNI y selfie** del chofer | Verificar la identidad al postularse | Solo el admin (permiso `choferes.ver_documentos`), con links firmados de 5 minutos. Soporte y el propio chofer no las ven. | Mientras exista la cuenta de chofer, porque respaldan su habilitación. Se borran al eliminar la cuenta (`servicios/eliminacionCuenta.js`). Si la postulación se rechaza, no se guardan. |
| **Datos del DNI** (número, nombre leído del código) | Evitar dos fichas con el mismo DNI y validar el nombre | Admin | Mientras exista la ficha; al eliminar la cuenta se anonimizan. |
| **Ubicación GPS del chofer** | Que el cliente vea el envío en el mapa | El cliente de ese envío, el chofer y el equipo (RLS de `ubicaciones_chofer`) | Se guarda **solo la última posición** del viaje en curso (no hay historial) y se borra al terminar, cancelarse o cambiar de chofer el envío. El seguimiento en segundo plano es opcional y se apaga al terminar el viaje. |
| **Foto de comprobante de entrega** | Probar que el envío se entregó | El cliente del envío, el chofer y el equipo | **180 días** desde la entrega (`RETENCION_FOTOS_ENTREGA_DIAS`); después se borra sola. También se borra si el cliente elimina su cuenta. |
| **PIN de entrega** | Que solo quien recibe confirme la entrega | El cliente, hasta que se entrega | Se borra al completar la entrega. |
| **Fotos del chat del envío** | Coordinar el retiro y la entrega | El cliente y el chofer del envío; el equipo ante un reclamo | **90 días** desde que el envío termina (`RETENCION_FOTOS_CHAT_DIAS`); el mensaje queda con un aviso. Se borran también al eliminar la cuenta. |
| **IP y navegador de los ingresos** (`auditoria_accesos`) | Seguridad: detectar ingresos sospechosos | Solo el equipo, desde la base | Se anonimizan a los **365 días** (`RETENCION_AUDITORIA_DIAS`); queda el registro del intento sin datos de conexión. Al eliminar la cuenta se anonimizan en el momento. |
| **Nombre, email y teléfono** | Contactar al usuario y mostrar el envío | El usuario y el equipo | Mientras exista la cuenta; al eliminarla se anonimizan. |
| **Direcciones de retiro y entrega** | Cotizar y hacer el envío | El cliente, el chofer asignado y el equipo | Se conservan con el envío como registro de la operación; al eliminar la cuenta se reemplazan por un texto genérico. |
| **Pagos** | Cobrar y devolver | El cliente y el admin | Se conservan como registro contable; al eliminar la cuenta se quitan los últimos dígitos de la tarjeta y el detalle del proveedor. La app nunca guarda el número completo de la tarjeta. |
| **Sesiones** (con IP y navegador) y **teléfonos para avisos** | Mantener la sesión y mandar notificaciones | Nadie del equipo los usa directamente | Las sesiones vencen a los 30 días y las vencidas se borran cuando el usuario vuelve a ingresar; todas se borran al eliminar la cuenta. Los tokens de avisos se borran al cerrar sesión, cuando el servicio los rechaza o al eliminar la cuenta. |

## Cómo se borra un archivo

Al vencer un plazo o al eliminar una cuenta, el archivo se anota en `archivos_por_borrar` y se intenta borrar en el momento. Si Storage no responde, el trabajo `borrar-archivos` lo reintenta cada hora hasta 10 veces; después queda en esa tabla para revisarlo a mano. Así un problema del proveedor no deja archivos olvidados.

## Pendiente

- Definir con el equipo si el DNI y la selfie deben borrarse también cuando un chofer deja de serlo sin eliminar su cuenta (hoy se conservan hasta eliminarla).
- La exportación de datos todavía no adjunta las fotos (pendiente #12).
- Revisar esta política con un asesor legal antes de operar con usuarios reales.
