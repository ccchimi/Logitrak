# 4. Casos de uso

Descripción de los casos de uso del Parcial 1. Al final de cada uno, **Implementación** resume cómo funciona hoy en el sistema y dónde difiere del diseño. Los casos de prueba de cada caso de uso están en el [documento 9](09-casos-de-prueba.md).

## CU-01 — Registrarse

- **Actor:** Cliente.
- **Precondición:** el usuario no tiene una cuenta con los datos que usa.
- **Flujo principal:** 1. Selecciona la opción de registro. 2. Ingresa sus datos. 3. El sistema valida la información. 4. El sistema crea la cuenta. 5. El usuario puede iniciar sesión.
- **Alternativos:** A1 Datos inválidos: el sistema indica qué corregir y se vuelve a validar. A2 Usuario existente: el sistema informa que ya existe una cuenta.
- **Postcondición:** el usuario queda registrado.
- **Implementación:** pide nombre, usuario y contraseña (8 caracteres o más) con confirmación. La cuenta se crea siempre como cliente, aunque se pida otro rol. Mientras escribe, la app avisa si el usuario ya está tomado.

## CU-02 — Iniciar sesión

- **Actores:** Cliente, Chofer, Administrador.
- **Precondición:** existe una cuenta registrada.
- **Flujo principal:** 1. Introduce sus credenciales. 2. El sistema las valida. 3. Identifica el rol. 4. Inicia la sesión. 5. El usuario accede a las funciones de su rol.
- **Alternativo:** A1 Credenciales incorrectas: el sistema rechaza el acceso y lo informa.
- **Postcondición:** el usuario queda autenticado.
- **Implementación:** el mensaje de error es el mismo si el usuario no existe o la contraseña es incorrecta, y hay un límite de 10 intentos cada 15 minutos. Las cuentas del equipo con verificación en dos pasos piden además un código. Si alguien olvidó la contraseña, soporte verifica su identidad y le da una temporal; al entrar con ella, la app pide elegir una nueva.

## CU-03 — Postularse como chofer

- **Actor:** Cliente.
- **Precondiciones:** registrado, autenticado y con intención de operar como chofer.
- **Flujo principal:** 1. Selecciona postularse. 2. El sistema pide la información. 3. El cliente la completa. 4. Declara su vehículo. 5. Inicia la verificación de identidad. 6. El sistema registra la información. 7. Procesa la postulación.
- **Alternativos:** A1 Información incompleta: el sistema pide los datos faltantes. A2 Verificación no aprobada: se informa y la postulación queda no aprobada.
- **Postcondición:** el usuario queda como postulante y, cumplidas las condiciones, puede operar como chofer.
- **Implementación:** la verificación es inmediata: si aprueba, la cuenta pasa a chofer con su ficha en el mismo paso. Se puede iniciar también desde la web (el diseño la preveía solo en el teléfono), aunque el escaneo funciona mejor en el teléfono.

## CU-04 — Verificar identidad

- **Actor principal:** Chofer o postulante. **Secundario:** Administrador.
- **Precondición:** el usuario está postulándose como chofer.
- **Flujo principal:** 1. Inicia la verificación. 2. El sistema pide documentación. 3. Se captura el DNI. 4. Se captura una selfie. 5. El sistema procesa la información. 6. Registra el resultado. 7. Si corresponde, continúa con su perfil de chofer.
- **Alternativos:** A1 Documentación inválida: se informa y se pide repetir. A2 Verificación no aprobada: se registra y no se habilita como chofer.
- **Postcondición:** queda registrada la información de la verificación.
- **Implementación:** se lee el código PDF417 del DNI y se compara el nombre con el ingresado; la prueba de vida y la comparación facial son opcionales y funcionan en el build nativo. Si no aprueba, las fotos no se guardan. Solo el administrador ve el DNI y la selfie. La validación con RENAPER está pendiente.

## CU-05 — Gestionar vehículo

- **Actor:** Chofer.
- **Precondiciones:** registrado y en proceso o con alta de chofer.
- **Flujo principal:** 1. Accede a la configuración del vehículo. 2. Lo declara. 3. Ingresa sus características. 4. El sistema valida. 5. Lo registra. 6. Queda asociado al chofer. 7. Se usa para decidir con qué envíos es compatible.
- **Alternativo:** A1 Datos inválidos: se indica qué corregir.
- **Postcondición:** el vehículo queda asociado y disponible para la compatibilidad.
- **Implementación:** el chofer elige su vehículo de la flota de Logitrak (motomensajería, utilitario liviano, furgón mediano y camión de carga pesada), cada uno con su capacidad de peso, bultos y volumen y sus cargas especiales (cadena de frío, carga voluminosa, mercancía peligrosa). La compatibilidad usa las mismas reglas que la cotización. No se puede cambiar el vehículo durante un viaje.

## CU-06 — Solicitar cotización

- **Actor principal:** Cliente. **Secundario:** Boxy.
- **Precondiciones:** registrado y autenticado; servicio disponible.
- **Flujo principal:** 1. Selecciona hacer un envío. 2. Boxy pide información. 3. El cliente da el origen. 4. El destino. 5. Describe la carga. 6. Boxy interpreta. 7. El sistema calcula la distancia. 8. Determina el vehículo. 9. Calcula el precio. 10. Genera la cotización. 11. La muestra desglosada. 12. El cliente la revisa.
- **Alternativos:** A1 Datos insuficientes: Boxy pide lo que falta. A2 Carga incompatible: se informa y no se cotiza.
- **Postcondición:** se obtiene una cotización válida.
- **Implementación:** Boxy entiende direcciones de barrios y localidades, pesos con unidades y respuestas como "sí" o "no", y clasifica la carga (frágil, refrigerada, documentos, entre otras). La cotización se calcula en el teléfono y el servidor la recalcula con el mismo código antes de cobrarla.

## CU-07 — Confirmar envío

- **Actor:** Cliente.
- **Precondiciones:** existe una cotización válida con la información necesaria.
- **Flujo principal:** 1. Revisa la cotización. 2. El sistema muestra el detalle. 3. La confirma. 4. El sistema crea el envío. 5. Queda asociado al cliente. 6. Se genera el registro.
- **Alternativo:** A1 El cliente abandona: no se crea el envío.
- **Postcondición:** existe un envío pendiente de pago.
- **Implementación:** el envío recibe su código de seguimiento y tiene 5 minutos para pagarse; si no se paga, vence y se elimina. Confirmar dos veces la misma cotización no crea dos envíos.

## CU-08 — Realizar pago

- **Actor:** Cliente. **Sistema externo:** Mercado Pago.
- **Precondiciones:** el envío existe y tiene importe.
- **Flujo principal:** 1. Accede al pago. 2. El sistema lo genera. 3. El cliente elige el medio. 4. Mercado Pago procesa. 5. El sistema recibe la respuesta. 6. Registra el estado. 7. Si se aprueba, el envío queda habilitado para asignarse.
- **Alternativos:** A1 Pago rechazado: se informa y puede reintentar. A2 Pago pendiente: se registra y se espera la confirmación.
- **Postcondición:** con el pago aprobado, el envío queda disponible para choferes compatibles.
- **Implementación:** Mercado Pago (link y QR), MODO y tarjeta. Se pueden aplicar cupones. Un reintento no cobra dos veces y un cobro duplicado se devuelve solo. El pago se confirma por el aviso firmado de Mercado Pago o, si no llega, consultando el pago.

## CU-09 — Tomar envío

- **Actor:** Chofer.
- **Precondiciones:** chofer verificado, con vehículo declarado y compatible; el envío está pago.
- **Flujo principal:** 1. El sistema publica el envío. 2. Los choferes compatibles lo ven. 3. Un chofer lo selecciona. 4. El sistema verifica la compatibilidad. 5. Registra la asignación. 6. El envío queda asociado al chofer. 7. Deja de estar disponible para otros.
- **Alternativo:** A1 Otro chofer lo toma primero: se registra la primera aceptación válida.
- **Postcondición:** el envío tiene chofer asignado.
- **Implementación:** los choferes compatibles reciben un aviso push. Cada chofer lleva un envío a la vez. Si nadie lo toma en 5 minutos, se cancela y se devuelve el pago.

## CU-10 — Actualizar estado del envío

- **Actor:** Chofer.
- **Precondición:** tiene un envío asignado.
- **Flujo principal:** 1. Inicia el servicio. 2. El sistema registra el primer hito. 3. Durante el recorrido actualiza los eventos. 4. El sistema los guarda. 5. El estado se actualiza. 6. El cliente ve los cambios.
- **Postcondición:** el estado queda actualizado y los eventos disponibles para la trazabilidad.
- **Implementación:** el chofer marca "en el punto de retiro" y "paquete retirado" y comparte su ubicación GPS. La entrega no se puede marcar como un hito más: se cierra con el PIN que tiene quien recibe y una foto de comprobante.

## CU-11 — Realizar seguimiento

- **Actor:** Cliente.
- **Precondiciones:** tiene un envío registrado y, si corresponde, con chofer asignado.
- **Flujo principal:** 1. Selecciona un envío. 2. El sistema muestra el estado. 3. El mapa. 4. La ruta. 5. Los eventos. 6. El chofer y el vehículo. 7. El cliente consulta la evolución.
- **Postcondición:** el cliente obtiene información actualizada.
- **Implementación:** los cambios llegan en tiempo real, con la posición del chofer en el mapa y la antigüedad de la última posición. El cliente ve el PIN de entrega y puede chatear con el chofer.

## CU-12 — Consultar historial

- **Actor:** Cliente.
- **Precondición:** autenticado.
- **Flujo principal:** 1. Accede a Historial. 2. El sistema consulta sus envíos. 3. Los muestra. 4. Selecciona uno. 5. Ve su información y estado.
- **Postcondición:** consulta sus operaciones anteriores.
- **Implementación:** historial por páginas con búsqueda por código o dirección, filtro por estado, totales pagados y porcentaje de envíos retirados a tiempo. Cada envío pago tiene su comprobante en PDF.

## CU-13 — Consultar cupones

- **Actor:** Cliente. **Origen de los cupones:** Sistema.
- **Precondiciones:** autenticado y con al menos un cupón.
- **Flujo principal:** 1. Accede a cupones. 2. El sistema los consulta. 3. Los muestra. 4. El cliente ve la información de cada uno.
- **Postcondición:** consulta sus cupones.
- **Implementación:** los cupones vencen a los 90 días y se avisa 7 días antes. Se aplican al pagar un envío.

## CU-14 — Gestionar compensación por SLA

- **Actor principal:** Sistema. **Beneficiario:** Cliente.
- **Precondiciones:** existe un envío con plazo comprometido que lo supera.
- **Flujo principal:** 1. El sistema controla el plazo. 2. Detecta el incumplimiento. 3. Genera la compensación. 4. Crea un cupón para el cliente. 5. La registra. 6. El cliente ve el cupón.
- **Postcondición:** la compensación queda registrada y el cliente tiene el cupón.
- **Implementación:** el plazo es el tiempo de retiro que prometió la cotización, desde el pago. Un trabajo del servidor revisa los envíos y acredita un cupón del 10 % una sola vez por envío.

## CU-15 — Gestionar usuarios y documentación

- **Actor:** Administrador.
- **Precondiciones:** autenticado y con los permisos correspondientes.
- **Flujo principal:** 1. Accede a la administración. 2. Consulta usuarios o choferes. 3. Selecciona uno. 4. Consulta su información. 5. Según sus permisos, consulta la documentación. 6. El sistema la muestra.
- **Alternativos:** A1 Usuario inexistente: se informa. A2 Sin permisos: se deniega el acceso.
- **Postcondición:** consulta la información según sus permisos.
- **Implementación:** el administrador lista usuarios con filtros, cambia roles, edita datos de otras cuentas y ve los documentos de identidad. El rol soporte ve la lista, atiende consultas y genera contraseñas temporales, pero no edita cuentas ni ve documentos.

## Casos de uso agregados en la implementación

| Caso | Actor | Resumen |
|---|---|---|
| Cancelar envío (RF09) | Cliente | Cancela un envío que ningún chofer tomó; si estaba pago, se le devuelve el importe |
| Chatear con el chofer (RF13) | Cliente, Chofer | Conversan con texto y fotos mientras dura el viaje |
| Calificar el envío (RF16) | Cliente | Califica al chofer de 1 a 5 estrellas una vez entregado |
| Atender consultas de soporte | Cliente, Soporte | El cliente abre una consulta; el asistente responde y, si hace falta, la deriva a una persona |
| Recuperar la contraseña | Cliente, Chofer, Soporte | Deja un pedido con un contacto; soporte verifica su identidad y le da una contraseña temporal |
| Gestionar la cuenta | Cliente, Chofer | Descarga sus datos o elimina la cuenta |
