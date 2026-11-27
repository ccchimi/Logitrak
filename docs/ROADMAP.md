# Roadmap de evolución

Hacia dónde puede crecer Logitrak una vez cerrado lo necesario para operar. Lo que falta para salir a producción (claves, cobros reales, pruebas en el teléfono) no está acá: está ordenado por etapas en el [plan post cursada](seminario/16-plan-post-cursada.md) y detallado en los [pendientes](pendientes-logitrak.md). Este documento cubre lo que viene después.

## Punto de partida

Lo que el sistema ya resuelve y sobre lo que se apoya cada línea:

- **Cotización en el servidor** con el mismo motor que Boxy: tarifa, vehículo, peso facturable, franjas horarias y plazo de retiro comprometido.
- **Asignación por oferta:** el envío pago se publica a los choferes cuyo vehículo puede llevarlo y lo toma el primero que acepta, uno por chofer.
- **Seguimiento en vivo:** última posición GPS del chofer, eventos del viaje, chat y aviso push.
- **SLA de retiro con compensación automática:** cupón del 10 % si el chofer llega tarde al retiro, revisado por un trabajo del servidor.
- **Panel del equipo** con indicadores, serie por día y alertas calculadas en la base.

## Líneas de evolución

| Línea | Qué agrega | Datos que necesita | Depende de |
|---|---|---|---|
| **1. Riesgo de retiro tarde** | Probabilidad de incumplir el SLA de retiro mientras todavía se puede actuar; nueva alerta en el panel. Detalle en el [módulo predictivo](MODULO-IA-PREDICTIVA.md). | Envíos cerrados con `sla_vence_en` y `retirado_en`, que ya se guardan | Algunos cientos de envíos reales |
| **2. Oferta priorizada** | Mostrar primero la oferta al chofer compatible más cercano al retiro y abrirla al resto si no la toma en un minuto. Sigue siendo una oferta, no una asignación impuesta. | Última posición de los choferes disponibles (hoy solo se guarda durante un viaje) | Que el chofer comparta su ubicación mientras está disponible, con su consentimiento |
| **3. Varios envíos por viaje** | Que un chofer con lugar en el vehículo sume un segundo envío cercano y la app le proponga el orden de las paradas. | Capacidad libre del vehículo y recorrido por calles (Google Directions) | Cambiar la regla de un viaje a la vez y el índice `uq_envios_un_viaje_por_chofer` |
| **4. Demanda por zona y horario** | Ver en el panel en qué zonas y franjas se concentran los pedidos y las ofertas que vencen sin chofer, para convocar choferes donde faltan. | Origen, franja y resultado de cada oferta, que ya se guardan | Volumen de envíos reales |
| **5. Cotización con datos propios** | Ajustar los recargos por franja y zona con lo observado, en lugar de los valores fijos de `tarifas.ts`. | Las líneas 1 y 4 | Validar cada cambio de tarifa con la batería de caracterización del cotizador |

## Orden propuesto

1. **Línea 4 primero:** es una consulta sobre datos que ya existen y no cambia ninguna regla. Sirve además para saber si hay volumen suficiente para las demás.
2. **Línea 1** como MVP del módulo predictivo, con la regla fija como base de comparación.
3. **Línea 2**, que reduce el tiempo hasta el retiro y por lo tanto los cupones. Necesita definir antes cómo se informa y se pide el consentimiento para compartir la ubicación fuera de un viaje.
4. **Líneas 3 y 5**, que tocan reglas centrales del negocio (un viaje por chofer y la tarifa) y conviene encararlas con datos reales de las anteriores.

Cada línea se considera terminada con pruebas automáticas propias, su documentación en el README del backend y, si cambia el precio, la batería de caracterización del cotizador en verde.
