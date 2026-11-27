# 7. Diagrama de clases de dominio

Modelo conceptual de Logitrak: los objetos del negocio, sus atributos principales, sus estados y cómo se relacionan. No describe cómo está programado (eso es el [diagrama de clases de diseño](12-diagrama-de-clases-de-diseno.md)) ni cómo se guarda (eso es el [diagrama de entidad relación](08-diagrama-entidad-relacion.md)), aunque cada clase corresponde a una tabla de la base.

## 7.1 Diagrama

```mermaid
classDiagram
    direction TB

    class Usuario {
        usuario
        nombreCompleto
        email
        telefono
        rol : Rol
        verificacionEnDosPasos : bool
        +registrarse()
        +iniciarSesion()
        +recuperarContrasena()
    }
    class Rol {
        <<enumeración>>
        cliente
        chofer
        soporte
        admin
    }
    class Chofer {
        codigo
        dni
        domicilio
        verificadoEn
        metodoVerificacion
        +postularse()
        +tomarEnvio(envio)
        +actualizarEstado(envio)
    }
    class Vehiculo {
        nombre
        maxKg
        maxBultos
        maxVolumenDm3
        capacidades : CapacidadEspecial[]
        tarifaBase
        porKm
    }
    class CapacidadEspecial {
        <<enumeración>>
        cadena_frio
        carga_voluminosa
        mercancia_peligrosa
    }
    class Cotizacion {
        codigo
        origen
        destino
        descripcionCarga
        categoriaCarga
        pesoKg
        pesoFacturableKg
        bultos
        distanciaKm
        precio
        estado : emitida | confirmada | vencida | descartada
        +desglose()
    }
    class Envio {
        codigo TRK-AAAA-NNNNNN
        origen
        destino
        precio
        estado : EstadoEnvio
        estadoPago : pendiente | pagado | rechazado | reembolsado
        slaMin
        pinEntrega
        fotoEntrega
        +confirmar()
        +cancelar()
        +entregar(pin, foto)
    }
    class EstadoEnvio {
        <<enumeración>>
        pendiente
        asignado
        en_viaje
        entregado
        cancelado
    }
    class EventoEnvio {
        tipo
        titulo
        detalle
        lat
        lng
        fecha
    }
    class Asignacion {
        pagoChofer
        prioridad
        expiraEn
        estado : ofrecida | aceptada | rechazada | expirada | completada
    }
    class Pago {
        codigo PAY-AAAA-NNNNNN
        metodo : mercadopago | modo | tarjeta
        monto
        descuento
        estado : pendiente | aprobado | rechazado | cancelado | expirado | reembolsado
        comprobante
        +aprobar()
        +reembolsar()
    }
    class Cupon {
        codigo
        descuentoPct
        motivo
        venceEn
        estado : activo | usado | vencido
    }
    class Valoracion {
        puntaje 1 a 5
        comentario
    }
    class UbicacionChofer {
        lat
        lng
        rumbo
        actualizadaEn
    }
    class MensajeEnvio {
        texto
        foto
        leidoEn
    }
    class ConsultaSoporte {
        codigo SOP-AAAA-NNNNNN
        asunto
        categoria
        estado : bot | escalado | resuelto | cerrado
    }
    class Notificacion {
        tipo
        titulo
        cuerpo
        leidaEn
    }

    Usuario --> Rol
    Usuario "1" -- "0..1" Chofer : es
    Chofer "*" --> "1" Vehiculo : maneja
    Vehiculo --> CapacidadEspecial
    Usuario "1" -- "*" Cotizacion : pide
    Cotizacion "1" -- "0..1" Envio : se confirma como
    Usuario "1" -- "*" Envio : es cliente de
    Chofer "0..1" -- "*" Envio : lleva
    Envio --> EstadoEnvio
    Envio "1" *-- "*" EventoEnvio : historial
    Envio "1" -- "*" Asignacion : se ofrece en
    Chofer "1" -- "*" Asignacion : recibe
    Envio "1" -- "*" Pago : se cobra con
    Pago "*" --> "0..1" Cupon : aplica
    Envio "1" -- "0..1" Cupon : compensa con
    Envio "1" -- "0..1" Valoracion : se califica con
    Envio "1" -- "0..1" UbicacionChofer : se sigue con
    Envio "1" *-- "*" MensajeEnvio : chat
    Usuario "1" -- "*" ConsultaSoporte : abre
    ConsultaSoporte "*" --> "0..1" Envio : sobre
    Usuario "1" -- "*" Notificacion : recibe
```

## 7.2 Clases y reglas del negocio

| Clase | Qué representa | Reglas principales |
|---|---|---|
| **Usuario** | Cualquier persona con cuenta | Se registra siempre como cliente; el rol lo cambia un administrador o la postulación como chofer |
| **Chofer** | Un usuario habilitado para llevar envíos | Necesita la identidad verificada y un vehículo de la flota; lleva un envío a la vez |
| **Vehiculo** | Una unidad de la flota | Su capacidad decide qué envíos puede llevar, con las mismas reglas que la cotización |
| **Cotizacion** | El precio que calcula Boxy para una carga | Vale por un tiempo; el servidor la recalcula antes de cobrarla |
| **Envio** | El servicio contratado | Se paga dentro de 5 minutos; se ofrece a choferes compatibles; se entrega con el PIN de quien recibe y una foto |
| **EventoEnvio** | Un hito del recorrido | Forma la línea de tiempo que ve el cliente; no se borra |
| **Asignacion** | La oferta de un envío a un chofer | La gana el primero que acepta; vence a los 5 minutos |
| **Pago** | Un intento de cobro | Un reintento no cobra dos veces; un cobro duplicado se devuelve |
| **Cupon** | Una compensación para el cliente | Se genera al incumplir el plazo de retiro (10 %); vence a los 90 días |
| **Valoracion** | La calificación del chofer | Una sola por envío entregado |
| **UbicacionChofer** | La última posición del chofer en un viaje | Solo existe mientras dura el viaje |
| **MensajeEnvio** | Un mensaje del chat del envío | Solo entre el cliente y el chofer, mientras dura el viaje |
| **ConsultaSoporte** | Un pedido de ayuda | La atiende el asistente y, si hace falta, una persona del equipo |
| **Notificacion** | Un aviso para el usuario | Se genera a partir de los eventos del sistema |

## 7.3 Ciclo de vida de un envío

```mermaid
stateDiagram-v2
    [*] --> pendiente : el cliente confirma la cotización
    pendiente --> [*] : no se paga en 5 minutos (se elimina)
    pendiente --> cancelado : el cliente lo cancela
    pendiente --> asignado : pagado y tomado por un chofer
    pendiente --> cancelado : pagado y nadie lo toma en 5 minutos (se reembolsa)
    asignado --> en_viaje : el chofer retira el paquete
    en_viaje --> entregado : PIN de quien recibe y foto
    entregado --> [*]
    cancelado --> [*]
```
