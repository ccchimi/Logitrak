# 16. Plan de tareas post cursada

Ordena todo lo que falta para que Logitrak pase de proyecto académico a un servicio que pueda operar con usuarios reales. Parte de la [lista de pendientes](../pendientes-logitrak.md) (los números `#` remiten a ella), de las [conclusiones de QA](../qa/conclusiones-qa.md) y del [backlog de usabilidad](../qa/pruebas-de-usabilidad.md#4-backlog).

**Las etapas, el esfuerzo y las áreas responsables son una propuesta.** Las fechas y las personas a cargo las define el equipo; el área sugerida sigue los roles del Parcial 1 (Franco: backend; Melina: frontend y UX/UI; Claudio: frontend y QA; Candela: gestión).

**Esfuerzo:** S = hasta 1 día · M = 2 a 5 días · L = más de una semana. **Prioridad:** Alta = bloquea operar con usuarios reales; Media = mejora importante; Baja = evolución.

## Etapa 1 · Configuración y cierre de seguridad (semanas 1 y 2)

Tareas que no necesitan programar, o muy poco, y que cierran riesgos o pedidos del profesor.

| # | Tarea | Prioridad | Esfuerzo | Área sugerida | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| #24 | Revisar en `auditoria_accesos` si alguien usó la recuperación de contraseña vieja | Alta | S | Backend | Acceso a la base de producción | Se revisaron los cambios previos al 26/11/2026 y, si hubo abuso, se avisó a las cuentas afectadas |
| #20 | Cargar `GOOGLE_DIRECTIONS_KEY` en Render | Alta | S | Backend | Cuenta de Google Cloud | `/api/salud` muestra `googleDirections: ok` y el mapa del teléfono dibuja la ruta por calles |
| #8 | Restringir las claves de Google y rotar la de Directions expuesta | Alta | S | Backend | #20 | Cada clave solo funciona desde su app, dominio o servidor |
| #14 | Cambiar la contraseña de los admins creados antes del cambio de seguridad | Alta | S | Gestión | — | El log de arranque no avisa de contraseñas iguales al usuario |
| #16 | Configurar el health check de Render en `/api/salud/vivo` | Media | S | Backend | — | Render reinicia la API si deja de responder |
| #15 | Activar Sentry en la API y en la app | Media | S | Backend + Frontend | Cuenta de Sentry | `/api/salud` muestra `sentry: ok` y llegan los errores de prueba |
| QA | Proteger la rama `main` (revisión obligatoria y CI en verde para fusionar) | Media | S | QA | — | No se puede subir a `main` sin pasar la CI |

## Etapa 2 · Verificación en dispositivos y producción (semanas 2 a 4)

| # | Tarea | Prioridad | Esfuerzo | Área sugerida | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| #13 | Generar el build nuevo de Android (SDK 58) y probarlo en el teléfono | Alta | M | Frontend + QA | Cuenta de Expo | Cámara, mapa, llavero seguro y GPS funcionan en un teléfono real |
| #26 | Distribuir ese build para que la recuperación nueva funcione en Android | Alta | S | Frontend | #13 | El pedido de recuperación se completa desde la app instalada |
| #18, #19 | Confirmar Realtime en producción: ubicación del chofer y chat | Alta | S | QA | #13 | El cliente ve moverse al chofer y los mensajes sin recargar |
| #9 | Probar la prueba de vida y la comparación facial en el build nativo | Media | M | Frontend + QA | #13 | Los casos CP-CU04-03 pasan en el teléfono |
| #18 | GPS en segundo plano: probarlo y declararlo para Play Store | Media | M | Frontend | #13 | El chofer comparte la ubicación con la app minimizada |
| QA | Pruebas de carga y concurrencia (RNF06) | Media | M | QA + Backend | — | Se conoce cuántos usuarios simultáneos soporta la API sin pasar los 3 s de RNF02 |
| #27 | Distancia por calle en la cotización del servidor, con la estimación actual como respaldo | Alta | M | Backend | #20 | Una cotización de CABA a Rosario usa los km de Directions y las pruebas de caracterización quedan actualizadas |

## Etapa 3 · Cobros reales (semanas 4 a 8)

Lo necesario para cobrar y pagar dinero real. Necesita decisiones del equipo (proveedores y condiciones con los choferes).

| # | Tarea | Prioridad | Esfuerzo | Área sugerida | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| #1, #6 | Pasar Mercado Pago a credenciales productivas y verificar reembolsos y avisos firmados reales | Alta | M | Backend | Cuenta productiva de Mercado Pago | Un reembolso real y un webhook firmado se procesan bien (CP-CU08-09) |
| #7 | Pasar Render a un plan pago o agregar un *keep-alive* | Alta | S | Gestión | Presupuesto | La API no se duerme y los avisos de pago llegan a tiempo |
| #22 | Definir cómo cobra el chofer y guardar su cuenta de cobro; tarjetas guardadas con un proveedor que tokenice | Alta | L | Backend + Frontend | Proveedor de pagos y condiciones con los choferes | El chofer recibe su pago y `MetodosScreen` guarda datos |
| #21 | Activar MODO | Baja | S | Backend | Credenciales de MODO | `/api/salud` muestra `modo: ok` y la app lo ofrece |

## Etapa 4 · Correo e identidad (semanas 6 a 10)

| # | Tarea | Prioridad | Esfuerzo | Área sugerida | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| #17 | Integrar un proveedor de correo (por ejemplo, Resend) y pedir el email al registrarse | Alta | M | Backend | Cuenta del proveedor | El comprobante llega por mail (RF14 completo) |
| #2 | Confirmar el email y el teléfono con un código | Media | M | Backend + Frontend | #17 | Un email nuevo no se guarda sin confirmarlo |
| #25 | Recuperación de contraseña con un link de un solo uso | Media | M | Backend + Frontend | #17, #2 | El usuario recupera su cuenta sin intervención de soporte |
| #23 | Validación oficial de identidad con RENAPER | Media | L | Backend | Convenio o proveedor autorizado | La postulación consulta RENAPER además del DNI y la selfie |
| #4 | Push en iOS y publicación en el App Store | Media | M | Frontend | Cuenta de Apple Developer | Las notificaciones llegan en un iPhone con el build propio |

## Etapa 5 · Experiencia de uso y calidad continua (en paralelo, desde la semana 3)

| # | Tarea | Prioridad | Esfuerzo | Área sugerida | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| US-01 | Direcciones rechazadas: indicar qué revisar y sugerir direcciones parecidas | Alta | M | Frontend + UX | — | Criterio de aceptación del ticket en el backlog de usabilidad |
| US-02 | Corregir una respuesta anterior de Boxy sin reiniciar | Media | M | Frontend + UX | — | Corregir un dato en no más de 2 toques |
| US-03 | Validar la tarjeta al escribirla | Media | S | Frontend | — | El error aparece en menos de 1 s y dice qué campo revisar |
| US-04 | Legibilidad: texto ampliable al 200 % y contraste 4,5:1 | Media | M | UX | — | Pasa la auditoría de ampliación y contraste |
| QA | Bajar el tiempo de carga de la Web App en el celular (LCP de 10 s → menos de 3 s) con carga diferida de pantallas | Alta | M | Frontend | — | Lighthouse mobile con LCP menor a 3 s (RNF02) |
| QA | ESLint bloqueante en la CI, Dependabot y CodeQL | Media | M | QA | Protección de `main` | La CI frena un cambio con errores de análisis estático |
| QA | Refactorizar `cotizarSync` (complejidad cognitiva 34) | Baja | M | Frontend | — | Complejidad menor a 15 sin cambiar las pruebas del cotizador |
| #5 | Subir la cobertura: pantallas de la app (hoy 24 % de líneas) y adjuntos de soporte con Storage en el backend | Baja | L | QA | — | Las pantallas principales y los adjuntos tienen pruebas |

## Etapa 6 · Evolución del producto (después de operar)

Ideas del [roadmap](../ROADMAP.md), que dependen de tener datos reales de uso:

| Tarea | Por qué espera |
|---|---|
| Riesgo de retiro tarde ([módulo de IA predictiva](../MODULO-IA-PREDICTIVA.md)) y oferta priorizada al chofer más cercano | Necesita historial de viajes reales para entrenar y validar |
| Handoff por QR para escanear el DNI desde el teléfono y seguir en la computadora (#3) | Mejora la postulación desde la web; no bloquea operar |
| Exportación de datos con las fotos (#12), cookie `HttpOnly` para la sesión web (#10), quitar el token largo de compatibilidad (#11) | Mejoras de privacidad y seguridad de menor impacto |

## Resumen

| Etapa | Tareas | Alta | Semanas (estimado) |
|---|---|---|---|
| 1. Configuración y seguridad | 7 | 4 | 1–2 |
| 2. Dispositivos y producción | 7 | 4 | 2–4 |
| 3. Cobros reales | 4 | 3 | 4–8 |
| 4. Correo e identidad | 5 | 1 | 6–10 |
| 5. Experiencia y calidad | 8 | 2 | En paralelo desde la 3 |
| 6. Evolución | 3 | — | Después de operar |

**Seguimiento propuesto:** cada tarea como un *issue* de GitHub con su número de pendiente o de ticket, la etiqueta de su etapa y el criterio "hecho cuando" como condición para cerrarlo. Al terminar una tarea se saca de la [lista de pendientes](../pendientes-logitrak.md), como indica ese documento.
