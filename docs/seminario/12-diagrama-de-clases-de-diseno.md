# 12. Diagrama de clases de diseño

El diagrama de clases de dominio (entregable 7, en el Parcial 1) muestra los conceptos del negocio: cliente, envío, pago, chofer. Este documento muestra **cómo está construido el software**: los módulos reales del código, qué ofrecen y de qué dependen.

Logitrak está escrito en JavaScript y TypeScript con funciones y módulos, no con clases. Por eso cada "clase" del diagrama es un **módulo** (un archivo), con el estereotipo que indica su papel, y sus operaciones son las funciones que exporta, con los mismos nombres que en el código. Las relaciones son:

- `*--` composición: un módulo arma su comportamiento con otros (por ejemplo, el router de envíos con sus partes).
- `-->` asociación: un módulo usa a otro.
- `..>` dependencia: lo usa en una operación puntual.

Los diagramas están en Mermaid: GitHub los muestra como imagen.

## 12.1 Backend: envíos, asignación y pagos

```mermaid
classDiagram
    direction LR

    class RutasEnvios {
        <<router>>
        /api/envios
    }
    class RutasAlta {
        <<router>>
        POST /
    }
    class RutasConsultas {
        <<router>>
        GET / , /panel , /consulta , /resumen , /:codigo , /:codigo/comprobante
    }
    class RutasViaje {
        <<router>>
        POST /:codigo/eventos
    }
    class RutasCliente {
        <<router>>
        POST /:codigo/cancelar , /:codigo/valoracion
    }
    class RutasAdministracion {
        <<router>>
        POST /:codigo/reembolsar , /archivar , /desarchivar , /pin/desbloquear
    }
    class RutasAsignaciones {
        <<router>>
        GET /disponibles , /activa
        POST /:codigoEnvio/tomar , /:codigo/completar , /ubicacion
    }
    class RutasPagos {
        <<router>>
        /api/pagos
    }
    class PagosComun {
        <<módulo>>
        +prepararCobro(cliente, pedido)
        +motivoNoPagable(envio)
        +precioConCupon(cliente, datos)
        +publicar(fila)
    }
    class Middleware {
        <<middleware>>
        +autenticar(req, res, next)
        +exigirPermiso(permiso)
        +exigirRol(roles)
        +validarRequest(esquemas)
    }
    class Cotizador {
        <<servicio>>
        +cotizarEnServidor(datos, instante)
        +verificarCotizacionParaEnvio(fila, clienteId, instante)
    }
    class Compatibilidad {
        <<servicio>>
        +puedeLlevar(aliasEnvio, aliasVehiculo) SQL
        +tieneViajeEnCurso(columnaChofer) SQL
        +requisitosDeCarga(cotizacion)
    }
    class Entrega {
        <<servicio>>
        +generarPin()
        +pinCorrecto(esperado, recibido)
        +guardarFotoEntrega(envioCodigo, foto)
    }
    class Sla {
        <<servicio>>
        +plazoDeLaCotizacion(cotizacion)
        +revisarSla(envioId)
    }
    class AprobacionPago {
        <<servicio>>
        +aprobarPago(cliente, pagoId, extra) Pago
        +aprobarEnTransaccion(pagoId, extra) Pago
    }
    class Cupones {
        <<servicio>>
        +reservarCupon(cliente, datos)
        +consumirCupon(cliente, pago)
        +aplicarDescuento(precio, descuentoPct)
    }
    class Reembolsos {
        <<servicio>>
        +reembolsarPagoDelEnvio(cliente, envioId)
    }
    class MercadoPago {
        <<adaptador>>
        +crearPreferenciaMp(pago, envio, baseUrl)
        +consultarPagoMp(pagoExtId)
        +reembolsarPagoMp(pagoExtId)
    }
    class Outbox {
        <<servicio>>
        +registrarEvento(cliente, evento)
        +despachar()
    }
    class Pool {
        <<acceso a datos>>
        +consultar(sql, params)
        +pool.connect() Cliente
    }

    RutasEnvios *-- RutasAlta
    RutasEnvios *-- RutasConsultas
    RutasEnvios *-- RutasViaje
    RutasEnvios *-- RutasCliente
    RutasEnvios *-- RutasAdministracion
    RutasPagos *-- PagosComun
    RutasEnvios --> Middleware
    RutasAsignaciones --> Middleware
    RutasPagos --> Middleware
    RutasAlta ..> Cotizador : verifica el precio
    RutasAlta ..> Compatibilidad : requisitos de carga
    RutasAsignaciones ..> Compatibilidad : ofertas y tomar
    RutasAsignaciones ..> Entrega : PIN y foto
    RutasCliente ..> Reembolsos : cancelar
    RutasAdministracion ..> Reembolsos
    RutasPagos ..> AprobacionPago
    RutasPagos ..> MercadoPago
    PagosComun ..> Cupones
    AprobacionPago ..> Cupones
    Reembolsos ..> MercadoPago
    AprobacionPago ..> Outbox : pago.aprobado
    RutasAsignaciones ..> Outbox : envío tomado
    Sla ..> Outbox : cupón por SLA
    RutasEnvios --> Pool
    RutasAsignaciones --> Pool
    AprobacionPago --> Pool
```

**Decisiones de diseño que muestra el diagrama:**

- Los routers solo traducen HTTP: validan con `validarRequest` (Zod), comprueban el permiso y delegan. Las reglas de negocio están en los servicios, para que se puedan probar sin HTTP.
- La aprobación de un pago vive en un solo servicio (`AprobacionPago`), que usan el pago con tarjeta, la confirmación de prueba, la consulta del estado y los dos webhooks.
- `Compatibilidad` genera fragmentos SQL: la misma regla filtra las ofertas, valida al tomar un envío y elige a quién avisar, así nunca divergen.
- Ningún servicio manda avisos en el momento: registran un evento en el `Outbox` dentro de la misma transacción, y un trabajo en segundo plano los despacha.
- El acceso a la base es SQL parametrizado con `pg`, sin ORM, para poder usar bloqueos de fila (`FOR UPDATE`) donde hay concurrencia.

## 12.2 Backend: autenticación, sesiones y recuperación

```mermaid
classDiagram
    direction LR

    class RutasAuth {
        <<router>>
        POST /login , /login/segundo-factor , /login/cambiar-contrasena
        POST /refresh , /logout , /registro , /recuperar
    }
    class RutasAdmin {
        <<router>>
        POST /usuarios/:id/contrasena-temporal
        PUT /usuarios/:id/rol
    }
    class Sesiones {
        <<servicio>>
        +emitirAccessToken(usuario, req) JWT
        +crearSesion(db, usuarioId, req) refreshToken
        +rotarSesion(db, refreshToken, req)
        +revocarSesionesDeUsuario(db, usuarioId, motivo)
    }
    class DobleFactor {
        <<servicio>>
        +verificarTotp(secreto, codigo)
        +firmarDesafio(usuarioId) JWT 5 min
        +consumirCodigo(cliente, usuarioId, codigo)
    }
    class Recuperacion {
        <<servicio>>
        +registrarPedidoDeRecuperacion(db, fila, contacto)
        +generarContrasenaTemporal() texto
        +sePuedeRecuperar(fila) bool
        +firmarDesafioCambio(usuarioId) JWT 10 min
    }
    class Permisos {
        <<middleware>>
        +PERMISOS
        +tienePermiso(usuario, permiso)
        +exigirPermiso(permiso)
        +permisosDe(rol)
    }
    class Limites {
        <<middleware>>
        +limiteLogin 10 cada 15 min
    }

    RutasAuth --> Sesiones
    RutasAuth --> DobleFactor
    RutasAuth --> Recuperacion
    RutasAuth --> Limites
    RutasAdmin --> Permisos
    RutasAdmin ..> Recuperacion : contraseña temporal
    RutasAdmin ..> Sesiones : revoca al cambiar el rol
    Recuperacion ..> Permisos : esPersonal
```

## 12.3 App: pantallas, componentes y servicios

```mermaid
classDiagram
    direction LR

    class ChoferScreen {
        <<pantalla>>
        -ofertas
        -viajeActivo
        -pasoEstado
        +tomar(oferta)
        +avanzarEstado()
    }
    class OfertasDisponibles {
        <<componente>>
    }
    class ViajeEnCurso {
        <<componente>>
        +PASOS_VIAJE
    }
    class ActividadReciente {
        <<componente>>
    }
    class useGpsDelViaje {
        <<hook>>
        +ubicacion
        +cambiarSegundoPlano(activar)
    }
    class actividadChofer {
        <<helper>>
        +metricasDelChofer(historial)
        +actividadReciente(historial, busqueda, orden)
    }
    class DetalleEnvioScreen {
        <<pantalla>>
        +cargar()
        +confirmarCancelacion()
    }
    class LoginScreens {
        <<pantalla>>
        +manejarIngreso()
        +verificarCodigo()
        +guardarContrasenaNueva(nueva, confirmacion)
    }
    class authService {
        <<servicio>>
        +iniciarSesion(usuario, contrasena)
        +completarSegundoFactor(desafio, codigo)
        +completarCambioDeContrasena(desafio, nueva, confirmacion)
        +pedirRecuperacion(usuario, contacto)
    }
    class asignacionesService {
        <<servicio>>
        +listarOfertas()
        +tomarEnvio(codigo)
        +completarAsignacion(codigo, entrega)
        +publicarUbicacion(posicion)
    }
    class enviosService {
        <<servicio>>
        +obtenerEnvio(codigo)
        +cancelarEnvio(codigo)
        +valorarEnvio(codigo, puntaje)
    }
    class realtimeEnvios {
        <<servicio>>
        +escucharEnvio(envioId, alCambiar)
    }
    class api {
        <<cliente HTTP>>
        +llamarApi(ruta, opciones)
        +guardarSesion(token, usuario, refreshToken)
        +obtenerUsuarioSesion()
    }
    class botLogistica {
        <<motor de reglas>>
        +cotizarEnvio(solicitud)
        +interpretarRespuesta(texto)
        +seleccionarVehiculo(carga)
    }

    ChoferScreen *-- OfertasDisponibles
    ChoferScreen *-- ViajeEnCurso
    ChoferScreen *-- ActividadReciente
    ChoferScreen --> useGpsDelViaje
    ChoferScreen ..> actividadChofer
    ChoferScreen --> asignacionesService
    DetalleEnvioScreen --> enviosService
    DetalleEnvioScreen --> realtimeEnvios
    LoginScreens --> authService
    authService --> api
    asignacionesService --> api
    enviosService --> api
    useGpsDelViaje ..> asignacionesService : publicarUbicacion
```

**Decisiones de diseño que muestra el diagrama:**

- Las pantallas solo coordinan el estado. Cada parte visible es un componente propio, y los cálculos y textos son funciones puras en `helpers/` con pruebas unitarias (observación del Parcial 2 sobre la modularización).
- Todas las llamadas a la API pasan por un único cliente HTTP (`api.ts`), que agrega el token, lo renueva solo cuando vence y guarda la sesión en el llavero del teléfono.
- `botLogistica` es el mismo código en la app (para responder al instante) y en el servidor (empaquetado con esbuild, para decidir el precio que se cobra).
