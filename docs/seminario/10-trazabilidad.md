# 10. Documento de trazabilidad

Vincula cada requerimiento del Parcial 1 con los casos de uso, las pantallas de la app, las rutas de la API, los módulos y tablas que lo implementan, y los casos de prueba que lo verifican ([documento 9](09-casos-de-prueba.md)). Así se puede seguir un requerimiento de punta a punta, o ver qué requerimiento se rompe si se toca una parte del código.

Las rutas de la API están documentadas en detalle en el [README del backend](../../backend/README.md); las pantallas, en el [README del frontend](../../frontend/README.md).

**Estados:** *Cumplido* (implementado y probado), *Cumplido con cambio* (implementado distinto del diseño, con el motivo en la sección 3 del [informe técnico](../informe-tecnico-parcial-2.md)), *Parcial* (falta una parte, con su pendiente).

## Matriz de requerimientos funcionales

| RF | Requerimiento | Caso de uso | Pantallas (`frontend/src/screens`) | Rutas de la API | Módulos y tablas principales | Casos de prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF01 | Inicio de sesión | CU-01, CU-02 | `LoginScreens`, `RegistroScreen`, `RecuperarScreen` | `/api/auth/*` (login, segundo factor, cambio de contraseña temporal, refresh, logout, registro, recuperar) | `servicios/sesiones.js`, `servicios/recuperacion.js`, `servicios/dobleFactor.js`; tablas `usuarios`, `sesiones`, `codigos_respaldo`, `auditoria_accesos` | CP-CU01-01 a 04, CP-CU02-01 a 08 | Cumplido |
| RF02 | Gestionar el perfil | CU-05 (vehículo) | `PerfilScreen`, `EditarPerfilModal`, `ExportarDatosModal`, `EliminarCuentaModal` | `/api/perfil/*`, `/api/perfil/doble-factor/*` | `servicios/exportacionCuenta.js`, `servicios/eliminacionCuenta.js`; tablas `usuarios`, `choferes` | CP-RF02-01, CP-RF02-02, CP-CU05-01 a 04 | Cumplido |
| RF03 | Solicitar envíos | CU-06, CU-07 | `HomeScreen` (Boxy), `SolicitudEnvioScreen` | `POST /api/cotizaciones`, `POST /api/envios` | `rutas/envios/alta.js`, `servicios/cotizador`; tablas `cotizaciones`, `envios`, `envio_eventos` | CP-CU06-01 a 06, CP-CU07-01 a 04 | Cumplido |
| RF04 | Recomendaciones de Boxy (IA) | CU-06 | `HomeScreen`, `components/boxy` | — (corre en el dispositivo) | `services/botLogistica` (NLP, direcciones, cargas, tarifas, conversación) | CP-CU06-02, CP-CU06-05, CP-CU06-06 | Cumplido con cambio: motor de reglas, no IA |
| RF05 | Costo automático | CU-06 | `SolicitudEnvioScreen`, `TarjetaCotizacion` | `POST /api/cotizaciones` (el servidor recalcula) | `botLogistica/tarifas.ts`, `servicios/cotizador/cotizador.generado.js` (mismo código empaquetado) | CP-CU06-01, CP-CU06-03, CP-CU06-04 | Cumplido; la distancia todavía es estimada entre localidades (#27) |
| RF06 | Pagos con Mercado Pago | CU-08 | `PagoScreen` | `/api/pagos/*` (checkout, tarjeta, confirmar, consultas, webhooks, devoluciones) | `servicios/pagos/*` (`aprobacion`, `mercadoPago`, `modo`, `cupones`, `reembolsos`, `intentos`); tablas `pagos`, `cupones` | CP-CU08-01 a 09 | Cumplido con credenciales de prueba; reembolso real pendiente (#1) |
| RF07 | Código de seguimiento | CU-07 | `DetalleEnvioScreen`, `HistorialScreen` | `POST /api/envios` | Columna `envios.codigo` (`TRK-AAAA-NNNNNN`) | CP-CU07-01 | Cumplido |
| RF08 | Consultar envíos activos | CU-11, CU-12 | `HomeScreen`, `HistorialScreen` | `GET /api/envios`, `GET /api/envios/resumen` | `servicios/envios/listado.js` | CP-CU12-01 a 04 | Cumplido |
| RF09 | Cancelar envíos | — | `DetalleEnvioScreen` | `POST /api/envios/:codigo/cancelar` | `rutas/envios/cliente.js`, `servicios/pagos/reembolsos.js` | CP-RF09-01, CP-RF09-02 | Cumplido |
| RF10 | Asignación automática (IA) | CU-09 | `ChoferScreen` | `/api/asignaciones/*` (disponibles, tomar, activa, completar) | `servicios/envios/compatibilidad.js`, `servicios/envios/expiracion.js`; tablas `asignaciones`, `vehiculos` | CP-CU09-01 a 07 | Cumplido con cambio: lo toma el primer chofer compatible |
| RF11 | Seguimiento en tiempo real | CU-10, CU-11 | `SeguimientoScreen`, `DetalleEnvioScreen`, `ChoferScreen` | `POST /api/envios/:codigo/eventos`, `POST /api/asignaciones/ubicacion`, `GET /api/recorridos` | Supabase Realtime (`services/realtimeEnvios.ts`), `servicios/envios/ubicacion.js`; tablas `envio_eventos`, `ubicaciones_chofer` | CP-CU10-01 a 05, CP-CU11-01 a 06 | Cumplido; falta validarlo en producción (#18) y la clave de Directions para la ruta del mapa (#20) |
| RF12 | Historial de envíos | CU-12 | `HistorialScreen` | `GET /api/envios` (páginas por cursor), `/api/envios/resumen` | `servicios/envios/listado.js` | CP-CU12-01 a 05 | Cumplido |
| RF13 | Comunicación cliente–conductor | — | `ChatEnvioScreen` | `/api/envios/:codigo/mensajes` | `servicios/envios/chat.js`; tabla `envio_mensajes` | CP-RF13-01 | Cumplido; falta validar Realtime en producción (#19) |
| RF14 | Comprobantes por email | — | `DetalleEnvioScreen` (descarga) | `GET /api/envios/:codigo/comprobante` | `servicios/envios/comprobante.js` | CP-RF14-01, CP-CU12-05 | Parcial: se descarga en PDF, no se manda por mail (#17) |
| RF15 | Notificaciones visuales | — | `NotificacionesScreen`, `components/Toasts` | `/api/notificaciones/*` | `outbox/` (manejadores), `servicios/push.js`; tablas `notificaciones`, `outbox_events`, `push_tokens` | CP-RF15-01 | Cumplido; push en iOS pendiente (#4) |
| RF16 | Valoraciones | — | `DetalleEnvioScreen` (`TarjetaValoracion`), `ChoferScreen` (`TarjetaReputacion`) | `POST /api/envios/:codigo/valoracion`, `GET /api/asignaciones/reputacion` | `servicios/envios/valoraciones.js` | CP-RF16-01 | Cumplido |
| RF17 | Panel de administración | CU-15 | `AdminDashboardScreen`, `TodosPedidosScreen`, `UsuariosAdminScreen`, `SoporteScreen` | `/api/admin/*`, `/api/envios/panel`, `/api/envios/consulta`, `/api/pagos/devoluciones-pendientes`, `/api/soporte/*` | `servicios/envios/panelAdmin.js`, `servicios/usuariosAdmin.js`, `servicios/perfilesAdmin.js`, `middleware/permisos.js`; tablas `soporte_tickets`, `soporte_mensajes` | CP-CU15-01 a 08, CP-RF17-01 | Cumplido |

## Casos de uso sin un requerimiento funcional propio

El Parcial 1 definió estos casos de uso en el alcance (cliente, chofer, sistema), sin un RF numerado:

| Caso de uso | Pantallas | Rutas de la API | Módulos y tablas | Casos de prueba | Estado |
|---|---|---|---|---|---|
| CU-03 Postularse como chofer | `TrabajaConNosotrosScreen` | `POST /api/choferes/postulacion` | `rutas/choferes.js`; tablas `choferes`, `vehiculos` | CP-CU03-01 a 04 | Cumplido |
| CU-04 Verificar identidad | `TrabajaConNosotrosScreen` (escaneo y selfie) | `POST /api/choferes/postulacion`, `GET /api/choferes/:codigo/documentos` | `servicios/verificacionIdentidad.js`, `servicios/almacenamiento.js` (bucket privado) | CP-CU04-01 a 03 | Cumplido con lectura del DNI; RENAPER (#23) y prueba de vida en el teléfono (#9) pendientes |
| CU-05 Gestionar vehículo | `PerfilScreen`, `TrabajaConNosotrosScreen` | `PUT /api/perfil`, `GET /api/vehiculos`, `PUT /api/admin/usuarios/:id` | `servicios/envios/compatibilidad.js`; tabla `vehiculos` | CP-CU05-01 a 04 | Cumplido |
| CU-13 Consultar cupones | `CuponeraScreen` | `GET /api/cupones` | `servicios/pagos/cupones.js`; tabla `cupones` | CP-CU13-01 a 04 | Cumplido |
| CU-14 Compensación por SLA | `CuponeraScreen`, `DetalleEnvioScreen` | — (trabajo del servidor `barrer-sla`) | `servicios/envios/sla.js`, `trabajos/index.js` | CP-CU14-01 a 04 | Cumplido |

## Matriz de requerimientos no funcionales

| RNF | Requerimiento | Cómo se cumple en el sistema | Casos de prueba | Estado |
|---|---|---|---|---|
| RNF01 | Disponibilidad 24/7 | Render con despliegue automático, chequeo de salud (`/api/salud`, `/api/salud/vivo`), trabajos que reintentan | CP-RNF01-01 | Parcial: el plan gratuito de Render se duerme por inactividad (#7) y falta configurar el health check (#16) |
| RNF02 | Respuesta en menos de 3 s | Índices y consultas agrupadas en el panel, cotización en el dispositivo, límites de tiempo en la base | CP-RNF02-01, CP-RNF02-02, CP-CU06-05 | Parcial: la API cumple; la carga de la Web App en el celular tarda 10 s |
| RNF03 | Datos almacenados de forma segura | bcrypt, refresh tokens solo como hash, bucket privado con links firmados, 2FA del equipo, plazos de conservación ([política de datos](../politica-de-datos.md)) | CP-RNF03-01 | Cumplido |
| RNF04 | Interfaz responsive | Un solo código para web, Android e iOS; tablas en pantallas anchas y tarjetas en el teléfono | CP-RNF04-01 | Cumplido |
| RNF05 | Acceso según el rol | Permisos por capacidad (`middleware/permisos.js`), verificados en cada pedido; RLS en Supabase | CP-RNF05-01, CP-CU15-02 | Cumplido |
| RNF06 | Usuarios simultáneos | Bloqueos de fila (`FOR UPDATE`), índice único de un viaje por chofer, claves de idempotencia en pagos | CP-RNF06-01, CP-RNF06-02 | Parcial: faltan pruebas de carga |

## Del código al requerimiento

Para saber qué requerimientos afecta un cambio:

| Si se cambia… | Afecta | Pruebas a revisar |
|---|---|---|
| `frontend/src/services/botLogistica/` o `backend/src/servicios/cotizador/` | RF03, RF04, RF05, CU-06 | `tarifas.test.ts`, `cotizador.test.js`, `circuito-completo.test.js` (y regenerar el cotizador empaquetado desde `backend/` con `npm run generar:cotizador`) |
| `backend/src/rutas/pagos/` o `servicios/pagos/` | RF06, CU-08, RF09, RF17 | `rutas-pagos.test.js`, `pagos-de-mas.test.js`, `devolucion-manual.test.js`, `cupones-*.test.js` |
| `backend/src/rutas/asignaciones.js` o `servicios/envios/compatibilidad.js` | RF10, CU-09, RNF06 | `rutas-choferes.test.js`, `trabajos.test.js` |
| `backend/src/rutas/auth.js`, `servicios/sesiones.js` o `servicios/recuperacion.js` | RF01, CU-01, CU-02, RNF03 | `rutas-auth.test.js`, `sesiones.test.js`, `recuperacion.test.js`, `doble-factor.test.js` |
| `backend/src/middleware/permisos.js` | RNF05, RF17, CU-15 | `roles.test.js`, `permisos.test.js`, `rutas-admin.test.js` |
| `backend/src/servicios/envios/sla.js` o `trabajos/index.js` | CU-14, CU-13 | `trabajos.test.js`, `cupones-vencimiento.test.js` |
| `backend/migrations/` | Todos | Suite completa del backend (las migraciones se aplican al arrancar) |
