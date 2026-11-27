# 9. Definición de los casos de prueba

Casos de prueba de Logitrak para los casos de uso CU-01 a CU-15 y los requerimientos del Parcial 1. Cada caso indica cómo se verifica:

- **Integración:** prueba automática de la API con `supertest` contra un PostgreSQL real (`backend/src/integracion/`).
- **Unitaria:** prueba automática de una función o módulo (`*.test.js` del backend, `*.test.ts` de la app).
- **Pantalla:** componente de la app renderizado con `jest-expo` y Testing Library (`*.test.tsx`).
- **Manual:** se verifica a mano en la Web App o en el teléfono. Se indica si ya se hizo o si está pendiente.

La columna **Evidencia** nombra el archivo y el título de la prueba que cubre el caso, para poder ubicarla y correrla. El estado de cada caso es el de la última ejecución completa (27/11/2026): **401 pruebas del backend y 319 de la app, todas en verde**, también en la CI de GitHub Actions.

Los casos del cotizador (RF-01 a RF-12 del TP2 de Calidad de Software) están detallados en el [plan de pruebas del cotizador](../qa/plan-de-pruebas-cotizador.md); acá se resumen dentro del CU-06.

## Cómo se ejecutan

```bash
# Backend: necesita una base PostgreSQL descartable (nunca la de producción)
docker run -d --name logitrak-pg-prueba -e POSTGRES_PASSWORD=prueba -p 55432:5432 postgres:17
cd backend
TEST_DATABASE_URL=postgresql://postgres:prueba@localhost:55432/postgres PGSSL=false npm run test:cobertura

# App
cd frontend
npm test
```

## CU-01 — Registrarse

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU01-01 | Registro válido | Usuario nuevo, contraseña de 8+ caracteres y confirmación igual | Se crea la cuenta siempre como cliente, aunque pida otro rol | Integración | `rutas-auth.test.js` › *crea la cuenta siempre como cliente, aunque pida otro rol* |
| CP-CU01-02 | Usuario existente (A2) | Usuario ya registrado | 409 con el mensaje "ya está registrado" | Integración | `rutas-auth.test.js` › *usuario repetido: 409* |
| CP-CU01-03 | Datos inválidos (A1) | Usuario con caracteres no permitidos, contraseña corta, confirmación distinta | 400 con el detalle por campo; no se crea nada | Integración + unitaria | `rutas-auth.test.js` › *datos inválidos: 400 con el detalle por campo*; `esquemas.test.js` |
| CP-CU01-04 | Aviso de usuario tomado al escribir | Usuario existente | La consulta responde que el usuario está tomado | Integración | `rutas-auth.test.js` › *dice si el usuario está tomado* |

## CU-02 — Iniciar sesión

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU02-01 | Credenciales correctas | Cuenta existente | Devuelve sesión, usuario y permisos del rol; el ingreso queda auditado | Integración | `rutas-auth.test.js` › *con la contraseña correcta devuelve sesión, usuario y permisos; queda auditado* |
| CP-CU02-02 | Credenciales incorrectas (A1) | Contraseña errónea o usuario inexistente | 401 con el mismo mensaje en los dos casos | Integración | `rutas-auth.test.js` › *contraseña incorrecta o usuario inexistente: 401 con el mismo mensaje* |
| CP-CU02-03 | Límite de intentos | 11 intentos desde la misma IP en 15 minutos | 429 a partir del intento 11 | Integración | `rutas-auth.test.js` › *después de 10 intentos desde la misma IP responde 429* |
| CP-CU02-04 | Cuenta del equipo con verificación en dos pasos | Admin con TOTP activo | La contraseña sola no abre sesión: pide el código; un código incompleto no llega al servidor | Integración + pantalla | `doble-factor.test.js`; `LoginScreens.test.tsx` › *con la verificación en dos pasos pide el código y recién ahí entra* |
| CP-CU02-05 | Ingreso con contraseña temporal de soporte | Cuenta con contraseña temporal vigente | No abre sesión: pide elegir una nueva y recién ahí entra; la temporal deja de servir | Integración + pantalla | `recuperacion.test.js` › *con la temporal no se entra…*; `LoginScreens.test.tsx` › *con la contraseña temporal de soporte pide elegir una nueva…* |
| CP-CU02-06 | Recuperar la contraseña | Usuario y contacto | Deja un pedido a soporte sin cambiar la contraseña; responde igual exista o no la cuenta | Integración + pantalla | `rutas-auth.test.js` › *no cambia la contraseña: deja el pedido a soporte*; `RecuperarScreen.test.tsx` |
| CP-CU02-07 | Sesión renovable y revocable | Sesión abierta | Renovar rota el token; cerrar sesión lo invalida; un token reusado revoca la cadena | Integración | `sesiones.test.js` (13 casos); `rutas-auth.test.js` › *renovar rota el token y cerrar sesión lo invalida* |
| CP-CU02-08 | La contraseña no queda en el login | Ingreso exitoso | El campo y la memoria del login quedan vacíos | Pantalla + manual (hecho) | `LoginScreens.test.tsx` › *una vez validada, la contraseña no queda guardada en el login* |

## CU-03 — Postularse como chofer

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU03-01 | Postulación aprobada | Cliente con DNI, selfie y vehículo de la flota | Pasa a chofer: se crea la ficha, cambia el rol y recibe un token nuevo | Integración | `rutas-choferes.test.js` › *con la identidad verificada pasa a chofer: ficha, rol y token nuevos* |
| CP-CU03-02 | DNI repetido o vehículo inexistente | DNI ya registrado; vehículo fuera de la flota | 409 y 400 respectivamente | Integración | `rutas-choferes.test.js` › *DNI ya registrado: 409; vehículo fuera de la flota: 400* |
| CP-CU03-03 | Información incompleta (A1) | Faltan campos o no hay sesión | 400 por campo; 401 sin sesión | Integración | `rutas-choferes.test.js` › *datos inválidos: 400 por campo; sin sesión: 401* |
| CP-CU03-04 | Validación del formulario en la app | Datos de la postulación | La app avisa los errores antes de enviar | Unitaria | `postulacion.test.ts` (10 casos) |

## CU-04 — Verificar identidad

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU04-01 | Verificación no aprobada (A2) | El nombre no coincide con el PDF417 del DNI | 422 con el motivo; la cuenta sigue siendo cliente y no se guardan las fotos | Integración | `rutas-choferes.test.js` › *si la verificación de identidad no cierra: 422 con el motivo, y sigue siendo cliente* |
| CP-CU04-02 | Acceso a la documentación | Admin, soporte y el propio chofer | Solo el admin ve el DNI y la selfie, con links firmados de 5 minutos | Integración | `rutas-choferes.test.js` › *solo el admin ve los documentos; soporte y el propio chofer no* |
| CP-CU04-03 | Prueba de vida y escaneo en el teléfono | Build nativo de Android | La cámara escanea el DNI y la prueba de vida detecta una persona | Manual (pendiente) | Requiere el build nuevo de SDK 58: [pendientes #9 y #13](../pendientes-logitrak.md) |

## CU-05 — Gestionar vehículo

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU05-01 | El chofer actualiza su vehículo | Chofer con ficha | Se guardan contacto, domicilio y vehículo; el nombre se copia a la ficha | Integración | `rutas-perfil.test.js` › *el chofer actualiza contacto, domicilio y vehículo…* |
| CP-CU05-02 | Datos del vehículo inválidos (A1) | Vehículo inexistente o datos mal formados | 400 y la ficha queda como estaba | Integración | `rutas-perfil.test.js` › *datos de chofer inválidos: 400 y la ficha queda como estaba* |
| CP-CU05-03 | Flota disponible | Con sesión | La flota se devuelve ordenada por capacidad | Integración | `rutas-perfil.test.js` › *devuelve la flota ordenada por capacidad, solo con sesión* |
| CP-CU05-04 | No cambiar el vehículo en pleno viaje | Chofer con un viaje en curso | El admin no puede cambiarle el vehículo | Integración | `perfiles-admin.test.js` › *no cambia el vehículo de un chofer con un viaje en curso* |

## CU-06 — Solicitar cotización

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU06-01 | Cotización desglosada | Origen, destino y carga válidos | El precio coincide con el cálculo a mano y es la suma del desglose redondeada a $50 | Unitaria | `tarifas.test.ts` (33 casos); [plan del cotizador](../qa/plan-de-pruebas-cotizador.md) RF-01 a RF-12 |
| CP-CU06-02 | Datos insuficientes (A1) | Falta el peso, la unidad o una dirección | Boxy pide el dato que falta y entiende respuestas como "sí/no" o pesos con unidades | Unitaria | `conversacion.test.ts`, `nlp.test.ts`, `direcciones.test.ts` |
| CP-CU06-03 | Carga incompatible (A2) | Volumen o peso fuera de la flota | No se genera una cotización válida y se informa | Unitaria | `tarifas.test.ts` › *rechaza cuando ninguna unidad soporta el volumen* |
| CP-CU06-04 | El precio lo decide el servidor (DEF-02) | Cotización con el precio modificado en la app | El servidor recalcula con el mismo código de Boxy y no acepta el precio enviado | Unitaria + integración | `servicios/cotizador/cotizador.test.js`; `circuito-completo.test.js` |
| CP-CU06-05 | Tiempo de respuesta de Boxy | 500 cotizaciones seguidas | Menos de 5 ms en promedio por cotización, muy por debajo de los 3 s de RNF02 | Unitaria | `rendimiento.test.ts` › *resuelve una cotización en menos de 5 ms en promedio* |
| CP-CU06-06 | Usabilidad del cotizador | 5 personas de 18 a 71 años | Completan cotizar, corregir y pedir | Manual (hecho, TP5) | [Pruebas de usabilidad](../qa/pruebas-de-usabilidad.md) |

## CU-07 — Confirmar envío

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU07-01 | Alta del envío | Cotización propia vigente | Se crea el envío con código `TRK-AAAA-NNNNNN`, plazo de pago y estado inicial | Integración | `rutas-envios.test.js` › *crea el envío desde una cotización propia, con código, plazo de pago y estado inicial* |
| CP-CU07-02 | Reintento sin duplicar | Misma cotización dos veces; cotización de otro cliente | Devuelve el mismo envío; la ajena no sirve | Integración | `rutas-envios.test.js` › *reintentar con la misma cotización devuelve el mismo envío…* |
| CP-CU07-03 | Sin cotización (A1) | Cotización inexistente | No se crea el envío | Integración | `rutas-envios.test.js` › *sin cotización o con una inexistente no se crea* |
| CP-CU07-04 | Pedido sin pagar | Envío impago pasados 5 minutos | Vence, se borra con sus intentos de pago y se avisa al cliente; uno pago nunca se borra | Integración | `impagos.test.js` (7 casos) |

## CU-08 — Realizar pago

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU08-01 | Pago aprobado | Tarjeta de prueba aprobada | El envío queda pago, se emite el comprobante y se guardan solo los últimos 4 dígitos | Integración | `rutas-pagos.test.js` › *aprobada: paga el envío, emite comprobante y guarda solo los últimos 4 dígitos* |
| CP-CU08-02 | Pago rechazado (A1) | Tarjeta rechazada | 402; el envío sigue impago y se puede reintentar | Integración | `rutas-pagos.test.js` › *rechazada: 402 y el envío sigue impago…* |
| CP-CU08-03 | Mercado Pago (checkout y QR) | Envío impago | Genera el QR; un reintento con la misma clave no duplica; la confirmación aprueba | Integración | `rutas-pagos.test.js` › *Mercado Pago sandbox: QR, reintento idempotente y confirmación* |
| CP-CU08-04 | Aviso de la pasarela (webhook) | Aviso sin firma o con firma inválida | Se rechaza (401); con firma válida se procesa | Integración + unitaria | `rutas-pagos.test.js` › *Mercado Pago: … firma inválida, 401; firma válida, 200*; `firmaMercadoPago.test.js` |
| CP-CU08-05 | Pago de un envío ajeno | Otro cliente | No puede pagar ni confirmar | Integración | `rutas-pagos.test.js` › *no se puede pagar el envío de otro cliente* |
| CP-CU08-06 | Cobro duplicado | Dos pagos aprobados del mismo envío | El segundo se devuelve solo; si la pasarela no deja, queda en revisión | Integración | `pagos-de-mas.test.js` (4 casos) |
| CP-CU08-07 | Pago con cupón | Cupón propio activo | Cobra con el descuento y consume el cupón; uno ajeno no se aplica | Integración | `rutas-pagos.test.js` › *con tarjeta: cobra con el descuento…* |
| CP-CU08-08 | Pago real de punta a punta | Teléfono, usuario comprador de prueba de Mercado Pago | El pago se aprueba y el envío pasa a pago | Manual (hecho) | [Integraciones](../integraciones.md) |
| CP-CU08-09 | Reembolso real | Credenciales productivas | La pasarela devuelve el importe | Manual (pendiente) | [Pendiente #1](../pendientes-logitrak.md) |

## CU-09 — Tomar envío

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU09-01 | Solo ofertas compatibles | Envíos pagos e impagos; vehículos distintos | El chofer ve los pagos que entran en su vehículo | Integración | `rutas-choferes.test.js` › *el chofer ve los envíos pagos que entran en su vehículo…* |
| CP-CU09-02 | Mismas reglas que la cotización | Helado (frío), solventes, cajas de 150 cm | Se aplican volumen, peso facturable y capacidad especial | Integración | `rutas-choferes.test.js` › *las ofertas usan las mismas reglas que la cotización…* |
| CP-CU09-03 | Un envío a la vez | Chofer con un viaje en curso | No ve ofertas ni puede tomar otro | Integración | `rutas-choferes.test.js` › *un chofer lleva un envío a la vez…* |
| CP-CU09-04 | Tomar un envío | Oferta vigente | Queda asignado, se registra el evento y se avisa al cliente | Integración | `rutas-choferes.test.js` › *tomar asigna el envío, deja el evento y avisa al cliente…* |
| CP-CU09-05 | Otro chofer lo toma primero (A1) | Dos choferes al mismo tiempo | El envío queda para uno solo | Integración | `rutas-choferes.test.js` › *dos choferes a la vez: el envío queda para uno solo* |
| CP-CU09-06 | Nadie lo toma | Pasan 5 minutos sin chofer | La oferta vence, el envío se cancela y se reembolsa | Integración | `trabajos.test.js` › *una oferta vencida se cancela y se reembolsa; repetir no hace nada*; `rutas-choferes.test.js` › *una oferta vencida o un envío inexistente no se toman* |
| CP-CU09-07 | Consola del chofer | Ofertas, viaje en curso, actividad | La pantalla muestra cada parte; las ganancias y la actividad se calculan bien | Unitaria + manual (hecho) | `actividadChofer.test.ts` (8 casos); revisión en la Web App local el 25/11/2026 |

## CU-10 — Actualizar estado del envío

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU10-01 | Hitos del viaje | Chofer asignado | Registra "en el punto de retiro" y "retirado"; el cliente ve los eventos | Integración | `circuito-completo.test.js` |
| CP-CU10-02 | Nadie marca entregado por los hitos | Cualquier usuario | La ruta de eventos no permite "entregado" | Integración | `entrega.test.js` › *nadie puede marcar entregado por la ruta de eventos* |
| CP-CU10-03 | Entrega con PIN y foto | PIN de quien recibe y foto | Queda entregado, con comprobante, sin PIN y con aviso al cliente | Integración | `entrega.test.js` › *PIN correcto y foto…* |
| CP-CU10-04 | PIN incorrecto | 5 intentos fallidos | Se bloquea; un admin lo desbloquea | Integración | `entrega.test.js` › *PIN incorrecto: cuenta los intentos y a los 5 se bloquea…* |
| CP-CU10-05 | Pantalla de entrega | Sin PIN completo o sin foto | No deja confirmar; con PIN incorrecto avisa y lo borra | Pantalla | `EntregaModal.test.tsx` (4 casos) |

## CU-11 — Realizar seguimiento

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU11-01 | Detalle del envío | Dueño, otro cliente, código inexistente | El dueño ve eventos y pagos; otro cliente no; inexistente 404 | Integración | `rutas-envios.test.js` › *el dueño ve el detalle con eventos y pagos…* |
| CP-CU11-02 | Ubicación del chofer | Viaje en curso | El chofer publica su posición y el cliente la ve; otro cliente no | Integración | `ubicacion.test.js` (5 casos) |
| CP-CU11-03 | La ubicación no se conserva | Entregado, cancelado o cambio de chofer | La posición se borra | Integración | `ubicacion.test.js` › *al entregar, la posición se borra* |
| CP-CU11-04 | Recorrido por calle | Origen y destino | El backend devuelve la ruta decodificada o la estima si no hay clave | Integración | `recorridos.test.js` (7 casos) |
| CP-CU11-05 | Textos del detalle | Distintos roles y estados | Títulos y avisos correctos para cliente, chofer y equipo | Unitaria | `detalleEnvio.test.ts` (10 casos) |
| CP-CU11-06 | Tiempo real en producción | Supabase Realtime | El cliente ve moverse al chofer y los mensajes sin recargar | Manual (pendiente) | [Pendientes #18 y #19](../pendientes-logitrak.md) |

## CU-12 — Consultar historial

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU12-01 | Páginas sin repetir | Más envíos que una página | Recorre todas las páginas sin repetir ni saltear | Integración | `paginacion.test.js` › *recorre todas las páginas sin repetir ni saltear…* |
| CP-CU12-02 | Búsqueda y filtros | Código, dirección, estado | Filtra en el servidor | Integración | `paginacion.test.js` › *busca por código o dirección, y filtra por estado* |
| CP-CU12-03 | Cada uno ve lo suyo | Dos clientes | Ninguno ve envíos ajenos | Integración | `paginacion.test.js` › *cada uno ve solo lo suyo*; `rutas-envios.test.js` |
| CP-CU12-04 | Resumen del historial | Historial completo | Suma todo y mide el SLA real | Integración | `paginacion.test.js` › *el resumen suma todo el historial y mide el SLA real* |
| CP-CU12-05 | Comprobante del envío | Envío pago | El dueño descarga el PDF; sin pago no hay; otro cliente no puede | Integración | `comprobante.test.js` (6 casos) |

## CU-13 — Consultar cupones

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU13-01 | Vigencia del cupón | Cupón emitido | Vence a los 90 días y la app recibe la fecha | Integración | `cupones-vencimiento.test.js` › *un cupón emitido vence a los 90 días…* |
| CP-CU13-02 | Cupón vencido | Fecha pasada | No se aplica al pagar | Integración | `cupones-vencimiento.test.js` › *un cupón pasado de fecha no se aplica al pagar…* |
| CP-CU13-03 | Aviso antes de vencer | Cupón activo que vence en 7 días | Se avisa una sola vez | Integración | `cupones-aviso.test.js` (5 casos) |
| CP-CU13-04 | Cuponera en la app | Cupones activos y vencidos | Muestra los días que quedan y el estado | Unitaria | `cupones.test.ts`, `vencimientoCupones.test.ts` |

## CU-14 — Gestionar compensación por SLA

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU14-01 | Plazo comprometido | Envío pago | El SLA es el plazo de retiro que prometió la cotización y corre desde el pago | Integración | `trabajos.test.js` › *el SLA es el plazo de retiro que prometió la cotización y corre desde el pago* |
| CP-CU14-02 | Retiro tarde | Retiro después del plazo | Cupón del 10 % con el evento que explica el plazo | Integración | `trabajos.test.js` › *retiro registrado tarde: cupón del 10 %…* |
| CP-CU14-03 | Plazo vencido sin retiro | Nadie retira a tiempo | Un cupón y un evento, una sola vez | Integración | `trabajos.test.js` › *plazo vencido sin retiro…* |
| CP-CU14-04 | El cliente no se emite cupones | Cliente intenta crear un cupón | Se rechaza; solo lo hace el sistema | Integración | `trabajos.test.js` › *un cliente ya no puede emitirse cupones…* |

## CU-15 — Gestionar usuarios y documentación

| ID | Caso | Datos / precondición | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-CU15-01 | Listado de usuarios | Búsqueda, rol, fechas | Filtra y pagina; nunca expone el hash de la contraseña | Integración | `rutas-admin.test.js` › *busca por usuario, filtra por rol y pagina…* |
| CP-CU15-02 | Sin permisos (A2) | Cliente o chofer | No ve el listado; soporte sí | Integración | `rutas-admin.test.js` › *el personal lo ve; un cliente o un chofer, no*; `roles.test.js` |
| CP-CU15-03 | Usuario inexistente (A1) | Id que no existe | 404 al editar o cambiar el rol | Integración | `rutas-admin.test.js` › *no se cambia el propio rol, ni el de un chofer, ni el de una cuenta que no existe* |
| CP-CU15-04 | Edición de datos | Admin sobre otra cuenta | Cambia el nombre y avisa al usuario; soporte no edita | Integración | `perfiles-admin.test.js` (7 casos) |
| CP-CU15-05 | Documentación de identidad | Admin, soporte | Solo el admin ve el DNI y la selfie | Integración | `rutas-choferes.test.js` › *solo el admin ve los documentos…* |
| CP-CU15-06 | Contraseña temporal | Soporte sobre un cliente | Se genera una sola vez, vence a las 24 horas; nunca sobre el equipo ni la propia | Integración | `recuperacion.test.js` › *solo el equipo la genera…* |
| CP-CU15-07 | Permisos en la lista | Admin y soporte | Cada fila ofrece solo las acciones permitidas | Unitaria + manual (hecho) | `panelAdmin.test.ts` › *Listados del panel*; revisión en la Web App local el 26/11/2026 |
| CP-CU15-08 | Panel del equipo | Base con envíos | Indicadores, serie por día y alertas coinciden con la base | Integración | `panel-admin.test.js` (4 casos) |

## Requerimientos sin un caso de uso propio

| ID | Requerimiento | Caso | Resultado esperado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-RF02-01 | RF02 Perfil | Cambiar nombre, email, teléfono y contraseña | Pide la contraseña; cambiar la contraseña cierra las otras sesiones | Integración | `rutas-perfil.test.js`, `perfil-datos.test.js`, `sesiones.test.js` |
| CP-RF02-02 | RF02 Perfil | Descargar mis datos y eliminar la cuenta | Exporta sin secretos; elimina anonimizando y conserva los comprobantes | Integración | `exportacion.test.js`, `eliminacion.test.js` |
| CP-RF09-01 | RF09 Cancelar | Cancelar sin chofer, pagado o no | Se cancela; si estaba pago se devuelve el importe | Integración | `rutas-envios.test.js` › *pagado y sin chofer: se cancela y se devuelve el importe* |
| CP-RF09-02 | RF09 Cancelar | Con chofer asignado | No se cancela desde la app | Integración | `rutas-envios.test.js` › *con chofer asignado o en viaje no se cancela desde la app…* |
| CP-RF13-01 | RF13 Comunicación | Chat del envío | Cliente y chofer conversan con texto y fotos mientras dura el viaje | Integración | `chat-envio.test.js` (7 casos) |
| CP-RF14-01 | RF14 Comprobante | PDF del envío | Se descarga desde la app (el envío por mail está pendiente) | Integración | `comprobante.test.js`; [pendiente #17](../pendientes-logitrak.md) |
| CP-RF15-01 | RF15 Notificaciones | Pago aprobado, envío tomado | Avisos en la bandeja y push a los choferes y al cliente | Integración | `push.test.js` (integración y servicio), `outbox.test.js` |
| CP-RF16-01 | RF16 Valoraciones | Calificar un envío entregado | Una sola vez, solo quien lo pidió; el chofer ve su promedio | Integración | `valoraciones.test.js` (5 casos) |
| CP-RF17-01 | RF17 Administración | Reembolsar, archivar, devoluciones manuales | Solo el admin; soporte no mueve plata | Integración | `rutas-envios.test.js`, `devolucion-manual.test.js`, `roles.test.js` |

## Requerimientos no funcionales

| ID | Requerimiento | Caso | Resultado | Tipo | Evidencia |
|---|---|---|---|---|---|
| CP-RNF01-01 | RNF01 Disponibilidad | Chequeo de salud | `/api/salud` informa base, Storage, pasarelas y trabajos | Integración | `salud.test.js` (6 casos). Render Free se duerme por inactividad: [pendientes #7 y #16](../pendientes-logitrak.md) |
| CP-RNF02-01 | RNF02 Tiempo de respuesta | Consultas del panel con 200.000 envíos | La serie del panel pasó de 7,5 s a 0,18 s | Manual (hecho, TP4) | [Medición de calidad](../qa/medicion-de-calidad.md) |
| CP-RNF02-02 | RNF02 Tiempo de respuesta | Carga de la Web App en el celular (LCP) | 10 s, por encima de los 3 s pedidos | Manual (hecho, **no cumple**) | [Medición de calidad](../qa/medicion-de-calidad.md), H-07 y H-09 |
| CP-RNF03-01 | RNF03 Datos seguros | Contraseñas, fotos, retención | bcrypt, bucket privado con links firmados, borrado por plazos | Integración | `retencion.test.js`, `archivos-por-borrar.test.js`, `seguridad.test.js` (middleware) |
| CP-RNF04-01 | RNF04 Responsive | Pantallas en computadora y teléfono | Tabla en pantallas anchas y tarjetas en el teléfono; accesibilidad 100 en Lighthouse | Manual (hecho) | Revisión en la Web App local; [medición de calidad](../qa/medicion-de-calidad.md) |
| CP-RNF05-01 | RNF05 Roles | Cada ruta con cada rol | Cada rol accede solo a lo suyo | Integración | `roles.test.js`, `permisos.test.js` |
| CP-RNF06-01 | RNF06 Concurrencia | Dos choferes, pagos repetidos | Bloqueos e idempotencia evitan duplicados | Integración | `rutas-choferes.test.js` › *dos choferes a la vez…*; `intentos.test.js` |
| CP-RNF06-02 | RNF06 Concurrencia | Muchos usuarios a la vez | Sin superar el tiempo de RNF02 | Manual (pendiente) | Pruebas de carga: [conclusiones de QA](../qa/conclusiones-qa.md) |

## Resumen

| | Cantidad |
|---|---|
| Casos de prueba definidos | 98 |
| Cubiertos por pruebas automáticas (algunos, además, revisados a mano) | 89 |
| Verificados solo a mano | 5 (uno no cumple: el tiempo de carga en el celular, CP-RNF02-02) |
| Pendientes de verificar (dependen de un build nuevo, credenciales productivas o pruebas de carga) | 4 |
