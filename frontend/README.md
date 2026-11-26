# Logitrak · Frontend Web

Documentación del frontend de Logitrak en su versión **Web App**: arquitectura, pantallas, configuración, ejecución local y publicación en navegador.

El código de `frontend/` se comparte con Android e iOS mediante Expo y React Native. La instalación y compilación nativa tienen una [guía exclusiva de Mobile App](../docs/mobile/README.md). La carpeta `docs/mobile/` contiene documentación; no es otro proyecto de código.

- [Web App en GitHub Pages](https://ccchimi.github.io/Logitrak/).
- [API configurada en Render](https://logitrak.onrender.com).
- [Documentación general](../README.md) y [backend](../backend/README.md).

Las funciones que requieren sesión, datos, mapas, pagos o notificaciones dependen de la API y de las credenciales configuradas en cada entorno. Esta guía describe el navegador; los requisitos nativos se documentan por separado.

## Tecnologías

| Área | Implementación actual |
|---|---|
| Base | Expo SDK 58, React Native 0.88, React 19.3 y TypeScript 6.0 |
| Navegación | React Navigation 7, stack nativo y contexto de flujo raíz |
| Web | `react-native-web` y exportación estática de Expo |
| UI | Componentes propios, `expo-linear-gradient`, fuentes Poppins, Syne y DM Sans, Material Icons |
| Mapas web | Google Maps JavaScript y componente `MapaSeguimiento.web.tsx` |
| Permisos y cámara web | Integración de los componentes compartidos según soporte del navegador |
| Sesión y preferencias | `expo-secure-store` para la sesión en el teléfono, AsyncStorage para preferencias (y la sesión en la web), cliente HTTP compartido y hooks de tema/preferencias |
| Tiempo real | Supabase Realtime para seguimiento y soporte, con credenciales emitidas por el backend |
| Errores | Integración opcional con Sentry |
| Pruebas | Jest: `ts-jest` para la lógica y `jest-expo` con Testing Library para las pantallas; comprobación de tipos con `tsc` |

El mapa web tiene su implementación en `MapaSeguimiento.web.tsx`. No se utiliza `react-native-maps-directions` ni una variable pública `EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY`. El contrato de rutas del móvil y su clave de servidor están explicados en la guía de Mobile App.

## Estructura

| Ubicación | Responsabilidad |
|---|---|
| `App.tsx` | Carga de fuentes, restauración de sesión, presentación pública y entrada a la aplicación. |
| `src/navigation/AppNavigator.tsx` | Stack, persistencia de navegación y selección del inicio según permisos. |
| `src/navigation/RootFlowContext.tsx` | Comunicación con el flujo raíz. |
| `src/screens/` | Pantallas. |
| `src/components/` | Controles reutilizables, modales, marco de aplicación, mapas y escáner. |
| `src/components/boxy/`, `admin/`, `inicio/` | Componentes específicos de cotización, operación y presentación pública. |
| `src/services/api.ts` | URL base, HTTP, encabezados, sesiones, refresh y tratamiento de errores de conexión. |
| `src/services/*Service.ts` | Contratos y operaciones de cada dominio. |
| `src/services/botLogistica/` | Conversación, interpretación y cotización de Boxy. |
| `src/services/botSoporte/` | Asistente local de soporte. |
| `src/services/realtime*.ts` | Suscripciones para seguimiento y soporte. |
| `src/services/almacenamiento.ts`, `monitoreo/` | Persistencia local y reporte de errores. |
| `src/hooks/` | Tema, preferencias, movimiento reducido, frases y panel operativo. |
| `src/helpers/`, `constants/` | Funciones auxiliares y contenido estático. |
| `src/theme/`, `styles/` | Paletas, variables de diseño y estilos. |
| `assets/` | Fuentes, ilustraciones, iconos e imágenes; ver [recursos y licencias](assets/README.md). |
| `scripts/verificar-backend.mjs` | Comprobación de salud de la API configurada. |
| `app.config.js`, `app.json` | Configuración Expo y prefijo de exportación web. Los perfiles EAS se explican en la guía mobile. |

La mayoría de las operaciones de negocio se centralizan en los servicios y en `api.ts`. Los mapas, Realtime, push y otros módulos de plataforma tienen integraciones específicas; no todas las conexiones de red pasan por el mismo cliente HTTP.

## Boxy y las cotizaciones

Boxy es un motor basado en reglas que se ejecuta en el cliente; no es un modelo de lenguaje remoto. Sus piezas principales son:

| Archivo | Función |
|---|---|
| `nlp.ts`, `conversacion.ts` | Interpretación de respuestas y conducción de la conversación. |
| `direcciones.ts` | Validación y normalización de direcciones, cobertura y estimación de distancias. |
| `cargas.ts` | Clasificación de la carga y necesidades especiales. |
| `tarifas.ts` | Selección de vehículo y desglose del precio, capacidades, tiempos y condiciones. |
| `conocimiento.ts`, `types.ts` | Datos y contratos compartidos por el motor. |

La inferencia inicial es local, pero **las direcciones y los datos de carga sí se envían al backend** al guardar la cotización y crear el pedido. El backend recalcula con una versión empaquetada del mismo motor y su importe es la referencia para cobrar. Las franjas horarias, fechas y demás condiciones operativas también influyen en el resultado.

No debe confundirse este motor con las propuestas de predicción logística del roadmap, que siguen siendo una evolución futura.

## Pantallas y navegación

`Inicio` se presenta desde `App.tsx`; no es una ruta del stack autenticado. Una sesión restaurada puede entrar directamente a la aplicación. Las rutas registradas incluyen:

| Ruta | Pantalla y alcance |
|---|---|
| `Login`, `Registro`, `Recuperar` | Inicio de sesión (con el paso del código si la cuenta tiene verificación en dos pasos, y el de elegir una contraseña nueva si entró con una temporal), alta de clientes y pedido de recuperación a soporte. |
| `Home` | Inicio de cliente o panel operativo para cuentas con permiso de consultar todos los envíos. |
| `SolicitudEnvio` | Conversación con Boxy y confirmación de cotización. |
| `Pago` | Checkout de Mercado Pago y formulario de tarjeta simulada. |
| `Seguimiento`, `DetalleEnvio` | Mapa, estado, eventos, datos del chofer con su promedio de calificaciones, comprobante de entrega, la calificación del envío, la descarga del comprobante en PDF y el acceso al chat con los mensajes sin leer. |
| `ChatEnvio` | Chat del envío entre el cliente y el chofer, con texto y fotos (se tocan para ampliarlas): mensajes por día, "Enviado"/"Leído" en el último propio y el motivo cuando está cerrado. Se abre desde el detalle, la tarjeta del viaje del chofer o el aviso. |
| `Historial` | Envíos entregados, de a 20, con "Cargar más" (o al llegar al final) y búsqueda por código o dirección. El resumen (cantidad, total pagado y cumplimiento del SLA) viene del servidor, y cada envío dice si el retiro se demoró. |
| `Perfil` | Datos, cambio de contraseña, verificación en dos pasos (equipo), preferencias, descarga de los datos de la cuenta, cierre de sesión y eliminación de cuenta según restricciones. |
| `Cuponera` | Cupones acreditados con su vencimiento ("Vence en 3 días", "Venció el…"), resaltado en la última semana, y cómo usarlos. El aviso de cupón por vencer abre esta pantalla. |
| `TrabajaConNosotros` | Formulario de postulación por pasos, vehículo, DNI y selfie. |
| `Chofer` | Ofertas que su vehículo puede llevar (un viaje a la vez), asignación, avances, chat con el cliente, cierre de viaje y la tarjeta "Tu calificación" con su promedio y los últimos comentarios. |
| `Estadisticas` | Estadísticas disponibles para el flujo del chofer. |
| `TodosPedidos` | Consulta operativa de pedidos con filtros y búsqueda. |
| `UsuariosAdmin` | Usuarios con filtros, paginación, edición de datos y cambio de roles según permisos. |
| `Soporte` | Asistente, tickets, conversación y atención del equipo. |
| `Notificaciones` | Bandeja y lectura de avisos. |
| `MetodosPago`, `MetodoCobro` | Formularios visuales de métodos; su guardado todavía no está implementado. |

Las ofertas, su toma y el aviso a los choferes usan las mismas reglas con las que el cotizador eligió el vehículo: peso facturable (el mayor entre el real y el volumétrico), bultos, volumen y capacidad especial (cadena de frío, carga voluminosa o mercancía peligrosa). El backend las aplica (`servicios/envios/compatibilidad.js`). Un chofer con un envío asignado o en viaje no recibe ofertas ni puede tomar otro; la consola ya ocultaba las ofertas durante el viaje.

El chofer inicia en su consola. El acceso operativo se decide por capacidades devueltas en la sesión y consultadas por `permisos.ts`. El backend vuelve a comprobar los permisos y el acceso a cada recurso; registrar una pantalla en el navegador no concede autorización.

### Panel del equipo

`AdminDashboardScreen`, `TodosPedidosScreen`, `UsuariosAdminScreen`, `usePanelAdmin` y los servicios de administración consumen datos de la API, sin descargar todos los pedidos. `usePanelAdmin` pide `/api/envios/panel` (indicadores, serie por día en hora de Argentina, distribución, alertas y opciones de filtro) y los cinco pedidos más recientes. `TodosPedidosScreen` arma la consulta con `parametrosDeConsulta` y pide a `/api/envios/consulta` solo la página que muestra; la búsqueda se manda cuando se deja de escribir. El listado de usuarios también recibe búsqueda, rol, fechas, orden y paginación desde el servidor.

`DevolucionesPendientes` muestra en el panel del admin los pagos que la pasarela no pudo devolver; cada fila lleva al detalle del envío, donde "Registrar devolución hecha a mano" pide confirmar y, opcionalmente, el número de operación.

Con el permiso `usuarios.editar` (solo admin), cada fila de Usuarios abre `components/admin/EditarUsuarioModal.tsx`: el nombre de cualquier cuenta y, en los choferes, el email, el teléfono, el domicilio y el vehículo. El código de chofer y el DNI se muestran pero no se editan, y desde el mismo modal se pasa al cambio de rol. `helpers/perfilesAdmin.ts` arma solo los campos que cambiaron y los valida igual que el servidor. Soporte ve la lista pero no edita. Con el permiso `usuarios.restablecer_contrasena` (soporte y admin), los clientes y choferes tienen el botón "Contraseña temporal" (`components/admin/ContrasenaTemporalModal.tsx`): pide confirmar que se verificó la identidad por el contacto del pedido y muestra la contraseña una sola vez, con su vencimiento. En una cuenta del equipo, el modal muestra si tiene la verificación en dos pasos y el admin puede restablecerla (dos toques para confirmar), salvo la propia. El permiso llega con el inicio de sesión: un admin con la sesión abierta desde antes de esta versión tiene que volver a entrar para ver la opción.

### Seguimiento, entrega y avisos

- El navegador utiliza `MapaSeguimiento.web.tsx`, con Google Maps JavaScript y una clave restringida por origen web. El mapa calcula una ruta y muestra al chofer en su última posición GPS, con una flecha de dirección; si pasan más de 2 minutos sin novedades, el marcador se atenúa. Sin envío real (la vista de demostración), el marcador recorre la ruta animado.
- El seguimiento escucha cambios de estados y eventos con Realtime cuando está disponible. Mantiene consultas de respaldo cada 60 segundos con la conexión activa y cada 10 segundos sin ella. La posición del chofer llega en el aviso de Realtime de `ubicaciones_chofer`, sin volver a pedir el envío. Si se abre el seguimiento solo con el código del envío (desde el panel), las direcciones salen del propio envío.
- En la consola del chofer, `useCompartirUbicacion` comparte la posición mientras hay un viaje en curso y la app está abierta: cuando se movió 15 m, como mucho cada 8 s, y al menos cada 45 s. Muestra si la está compartiendo o por qué no (sin permiso, GPS apagado), con un botón para reintentar. En la web usa `navigator.geolocation` directamente (`services/gps.ts`): el seguimiento web de `expo-location` no entrega las posiciones cuando el id del navegador no coincide con el suyo.
- El chofer confirma la entrega con el PIN informado por el receptor y una foto, mediante el servicio de asignaciones. El PIN y su bloqueo los controla el backend.
- Con el envío entregado, el detalle le muestra al cliente la tarjeta "¿Cómo fue la entrega?" (`components/envio/TarjetaValoracion.tsx`): elige de 1 a 5 estrellas, cada una con su nombre (Mala a Excelente) y accesible como grupo de opciones, y puede dejar un comentario de hasta 500 caracteres. Se califica una sola vez; después queda a la vista como "Tu calificación". El chofer ve su promedio y la distribución en `components/chofer/TarjetaReputacion.tsx`, que se recarga al cerrar cada entrega. Los textos y el formato del promedio están en `helpers/valoraciones.ts`.
- El chofer puede activar "Seguir compartiendo con la app minimizada": `services/gpsSegundoPlano.ts` registra una tarea de `expo-task-manager` (se define al cargar `index.ts`) y usa `startLocationUpdatesAsync` con el servicio en primer plano de Android y su notificación fija. Pide el permiso de ubicación "todo el tiempo", aplica las mismas reglas de envío que en primer plano y se apaga al terminar el viaje. No existe en la web ni en Expo Go.
- `ChatEnvioScreen` escucha `envio_mensajes` por Realtime (mensajes nuevos y leídos) y, sin Realtime, consulta cada 5 segundos. Los helpers de `helpers/chat.ts` arman los separadores por día, el estado de lectura y la validación del texto (hasta 1000 caracteres) y de la foto (hasta 8 MB). El botón 📷 usa `expo-image-picker`: en el teléfono ofrece sacar una foto o elegirla de la galería, y en la web abre el selector de archivos; antes de mandarla se ve una vista previa que se puede quitar.
- Desde que el envío está pago, la tarjeta de pagos del detalle tiene "Descargar comprobante (PDF)" (para el cliente y el personal). `obtenerComprobante` lo recibe en base64 y `guardarPdf` (`services/descargas.ts`) lo descarga en la web, lo guarda en la carpeta que se elija en Android o abre la hoja de compartir en iOS.
- Soporte combina Realtime con consultas periódicas. La bandeja de notificaciones y el push son mecanismos distintos.
- La Web App dispone de la bandeja de notificaciones, pero `pushService.ts` omite el registro push en web. La configuración de notificaciones nativas está en la guía mobile.

## Mi Perfil, sesión y preferencias

La aplicación guarda la sesión y utiliza refresh tokens para renovar el acceso. En Android e iOS el token de acceso y el refresh token van al almacenamiento seguro del sistema (`leerSecreto`/`guardarSecreto` en `services/almacenamiento.ts`, con `expo-secure-store`); una sesión guardada por una versión anterior pasa sola al llavero y se borra la copia sin cifrar. Si el llavero falla, el secreto no se guarda en claro: la sesión sigue en memoria y al reabrir la app pide ingresar. En la web siguen en el almacenamiento del navegador. El cierre de sesión borra el estado local e intenta revocar la sesión remota; la baja de push corresponde al flujo móvil. Si no hay conexión, la revocación remota no queda garantizada por el borrado local.

| Función | Estado del código actual |
|---|---|
| Consulta de perfil y resumen | Conectada a los servicios de perfil. |
| Cambio de contraseña | Disponible; exige la contraseña actual al guardar en el backend. |
| Comprobación previa de contraseña | Usa login con `X-Logitrak-Sesion: verificar`; comprueba que la identidad devuelta coincide con la cuenta local y no reemplaza la sesión. |
| Nombre, email y teléfono | `EditarPerfilModal` verifica la contraseña, muestra el valor actual y valida con las mismas reglas que el servidor (`helpers/perfil.ts`); `actualizarDatosPerfil` guarda con la contraseña en `/api/perfil/datos` y renueva la sesión. Vaciar el email o el teléfono los borra, salvo para un chofer. |
| Usuario, domicilio y vehículo | No se editan desde acá: el usuario es fijo y los datos de la ficha del chofer los cambia el equipo. |
| Verificación en dos pasos | Solo admin y soporte. `DobleFactorModal` guía la activación: contraseña, QR (o la clave en grupos de 4 para cargarla a mano), primer código y los 10 códigos de respaldo, que se pueden descargar en un `.txt`. Con la verificación activa, la tarjeta muestra cuántos códigos quedan (avisa con 3 o menos) y permite generar nuevos o desactivarla con contraseña y código (`services/dobleFactorService.ts`, `helpers/dobleFactor.ts`). En el login, `iniciarSesion` devuelve el desafío y `completarSegundoFactor` termina el ingreso; el campo acepta el código pegado con espacios y los de respaldo con o sin guion. |
| Descargar mis datos | `ExportarDatosModal` pide la contraseña y guarda un JSON con todo lo de la cuenta: en la web se descarga, en Android se elige la carpeta y en iOS se abre la hoja de compartir (`services/descargas.ts`). |
| Eliminación de cuenta | Conectada al endpoint correspondiente, con contraseña y restricciones por rol y operaciones activas. |
| Tema claro/oscuro y modo silencioso | Guardados localmente por `preferenciasService.ts`; no se sincronizan con el servidor. |

La comprobación previa de credenciales no entrega un permiso reutilizable para editar campos. La edición segura de datos sensibles requiere un contrato adicional del backend.

El modo silencioso controla los sonidos que consultan el servicio de preferencias; no modifica las notificaciones externas del navegador. Los hooks y transiciones contemplan movimiento reducido en las partes que los utilizan; no constituyen una certificación de accesibilidad de todas las pantallas. La limitación del sonido push nativo se documenta en la guía mobile.

La recuperación de contraseña la resuelve soporte. `RecuperarScreen` manda el usuario y un email o teléfono de contacto (`pedirRecuperacion`) y muestra siempre el mismo mensaje, exista o no la cuenta; no pide una contraseña nueva. Cuando alguien entra con la contraseña temporal que generó soporte, el login no abre la sesión: muestra `components/auth/CambioContrasenaTemporal.tsx` para elegir una nueva (`completarCambioDeContrasena`) y recién ahí entra. Una vez validada, la contraseña se borra del campo y de la memoria del login.

## Pagos e identidad: alcance actual

La interfaz ofrece Mercado Pago y tarjeta. La integración directa con MODO permanece en servicios, pero no aparece como un método independiente seleccionable. El QR de Checkout Pro representa el enlace devuelto por Mercado Pago; la compatibilidad de lectura y pago desde otras billeteras debe validarse con el proveedor, no deducirse del texto de la interfaz.

El formulario de tarjeta utiliza un **procesador simulado en el backend**. No deben ingresarse tarjetas reales. Guardar tarjetas o cuentas de cobro desde `MetodosScreen` también está pendiente.

La postulación de chofer combina datos personales, vehículo, lectura del DNI y selfie. En navegador, la cámara y la lectura del documento dependen de sus permisos y compatibilidad. La prueba de vida de ML Kit requiere el flujo nativo documentado en Mobile App. La comparación facial depende de los modelos del servidor y RENAPER real sigue pendiente en backend.

## Requisitos y configuración

Usá **Node.js 22.13.0 o superior**, el mínimo de Expo SDK 58. Los workflows usan Node 22. Hace falta una API alcanzable; no es obligatorio ejecutar el backend local para trabajar en frontend.

Desde la raíz del repositorio:

```bash
cd frontend
npm ci
cp .env.example .env
```

Configurá las variables de `.env` antes de iniciar Expo:

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API. El ejemplo apunta al servicio en Render. |
| `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` | Maps JavaScript y rutas en web. |
| `EXPO_PUBLIC_SENTRY_DSN` | Reporte opcional de errores. |

Para navegador y backend en la misma computadora puede usarse `http://localhost:4000`. Si la API corre en otra máquina o está desplegada, configurá su URL alcanzable. Un sitio servido por HTTPS debe consumir una API HTTPS para evitar bloqueos de contenido mixto. Conviene definir la URL explícitamente.

Las variables `EXPO_PUBLIC_*` forman parte del bundle y no son secretas. Restringí la clave web de Maps por origen y APIs utilizadas, incluyendo el dominio publicado y los orígenes locales necesarios. La clave `GOOGLE_DIRECTIONS_KEY` pertenece únicamente al backend. Reiniciá Expo después de cambiar variables del cliente.

El ejemplo de API pública utiliza datos del entorno al que apunta. Para pruebas que creen o modifiquen registros, usá un entorno y cuentas destinados a pruebas.

## Ejecución, comprobaciones y builds

Ejecutá los comandos desde `frontend/`:

| Comando | Qué hace |
|---|---|
| `npm start` | Inicia Metro; permite elegir la plataforma web. |
| `npm run web` | Inicia la aplicación web local. |
| `npm run typecheck` | Comprueba tipos sin generar archivos de compilación. |
| `npm test -- --runInBand` | Ejecuta las pruebas Jest. |
| `npm run test:coverage -- --ci` | Ejecuta Jest con la cobertura del cotizador y su umbral. |
| `npm run test:cobertura:app` | Mide la cobertura de toda la app, sin umbral (informativa). |
| `npm run build:web` | Exporta la Web App a `dist/`. |
| `npm run verify:backend` | Consulta `/api/salud` en la API configurada. No prueba login ni operaciones de negocio. |

Para abrir la versión de desarrollo ejecutá `npm run web` y usá la dirección que informe Expo. Para comprobar la exportación, ejecutá `npm run build:web` y serví `dist/` con un servidor estático; abrir el archivo HTML directamente no equivale al despliegue web.

Jest corre dos grupos (`jest.config.js`): **lógica**, con `ts-jest`, para el cotizador, los helpers y los servicios (`*.test.ts`), y **pantallas**, con `jest-expo` y Testing Library (`*.test.tsx`, preparación en `src/__pruebas__/`), para componentes renderizados: la tarjeta de cotización con una cotización real de Boxy, la entrega con PIN y foto, y el login con verificación en dos pasos. El umbral de `jest.config.js` se aplica a la cobertura del cotizador (tarifas, cargas, direcciones y NLP); la de toda la app se mide aparte con `jest.cobertura-app.config.js`, que cuenta cada archivo una sola vez, y la CI la publica en el resumen sin frenar. La cantidad de casos y su resultado deben consultarse en la ejecución correspondiente.

### Publicación web

El [workflow web](../.github/workflows/web.yml) exporta Expo y publica en GitHub Pages cuando cambian los archivos definidos en `main`. Usa `EXPO_BASE_URL=/Logitrak`, la URL de API y las variables de Maps/Sentry configuradas en GitHub Actions. La exportación manual no se publica por sí sola.

El workflow copia `dist/index.html` a `dist/404.html` para que las rutas desconocidas vuelvan a la aplicación. La API permanece desplegada por separado en Render; la exportación de Expo no genera ni inicia un backend.

Los perfiles de EAS y la instalación Android/iOS se explican únicamente en la [guía Mobile App](../docs/mobile/README.md).

## Limitaciones y documentación

- Los cupones vigentes se eligen en la pantalla de pago, con su vencimiento al lado del código, y el total muestra el descuento. `helpers/cupones.ts` trata como vencido un cupón pasado de fecha aunque el servidor todavía no lo haya marcado.
- Los vencimientos de pedidos impagos, ofertas y compensaciones dependen de trabajos del servidor, no de mantener abierta esta aplicación.
- El panel operativo necesita mejorar la consulta paginada de pedidos para escalar a históricos completos.
- Algunas ediciones de perfil y el guardado de métodos son funciones pendientes, aunque existan controles visuales.
- La salud de la API y las funciones reales dependen del despliegue; una exportación web correcta no valida la integración completa.
- Las propuestas predictivas no forman parte del cotizador actual.

Ver [pendientes](../docs/pendientes-logitrak.md), [plan de pruebas](../docs/qa/plan-de-pruebas-cotizador.md), [mantenimiento](../docs/qa/plan-de-mantenimiento.md) y [roadmap](../docs/ROADMAP.md). Ante diferencias entre textos históricos y código, verificá el contrato vigente.

`node_modules/`, `dist/`, archivos de entorno reales y credenciales de build están excluidos por las reglas de Git. Las dependencias y la exportación se regeneran desde los archivos versionados.
