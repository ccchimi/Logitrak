# Módulo de inteligencia logística predictiva

Propuesta de evolución para anticipar qué envíos van a incumplir el plazo de retiro antes de que pase. **No está implementado:** Boxy cotiza con reglas fijas y el panel del equipo detecta los incumplimientos cuando ya ocurrieron. Este documento define qué se predeciría, con qué datos que el sistema ya guarda y cómo se integraría sin cambiar el circuito actual.

## 1. Qué problema resuelve

El compromiso que Logitrak le hace al cliente es de **retiro**: "chofer en el punto de retiro en menos de N minutos desde el pago o bonificamos el 10 % del flete". N sale de la cotización (ETA de retiro más 5 minutos en tramos urbanos o 10 en interurbanos) y el servidor lo controla con `sla_vence_en` y `retirado_en` (ver [backend, SLA y cupones](../backend/README.md#trabajos-en-segundo-plano)).

Hoy el equipo se entera tarde. El panel muestra tres alertas calculadas con reglas (`servicios/envios/panelAdmin.js`):

- `sinChofer`: envíos pagos que todavía nadie tomó;
- `slaVencido`: envíos cuyo plazo de retiro ya venció sin retiro;
- `ofertasVencidas`: ofertas que vencieron a los 5 minutos y se van a cancelar con reembolso.

Las tres llegan cuando el cupón ya es inevitable. El módulo agregaría una cuarta mirada: **qué envíos pagos y todavía sin retirar tienen alta probabilidad de incumplir**, con tiempo para actuar (contactar al chofer, avisar al cliente o, si nadie lo tomó, priorizar la oferta).

## 2. Qué se predice

Una probabilidad, entre 0 y 1, de que un envío pago termine con `retirado_en > sla_vence_en` o sin retiro antes del vencimiento. Se calcula en dos momentos:

| Momento | Qué se sabe | Para qué sirve |
|---|---|---|
| Al aprobarse el pago, sin chofer | Carga, vehículo requerido, distancia, franja horaria, choferes compatibles con la app abierta | Detectar envíos que probablemente nadie tome a tiempo |
| Cuando un chofer lo toma | Lo anterior, más el tiempo que tardó la oferta en tomarse y la distancia del chofer al retiro (con su última posición GPS) | Detectar retiros que no van a llegar aunque haya chofer |

## 3. Datos de entrada

Todos salen de tablas que ya existen. No hace falta guardar datos nuevos de las personas.

| Variable | Origen |
|---|---|
| Distancia del recorrido y si es urbano o interurbano | `envios.distancia_km`, snapshot de `cotizaciones` |
| Plazo comprometido | `envios.sla_min` |
| Vehículo requerido, peso facturable, volumen y capacidad especial | `envios.peso_facturable_kg`, `volumen_dm3`, `capacidad_requerida`, `vehiculos` |
| Día de la semana y franja horaria (en hora de Argentina) | `envios.creado_en`, `pagos.pagado_en` |
| Zona de retiro | Coordenadas de origen agrupadas por barrio o cuadrícula |
| Choferes compatibles activos en ese momento | `choferes` + `vehiculos` con la misma regla de `compatibilidad.js` |
| Minutos entre el pago y la toma | `asignaciones` |
| Distancia del chofer al retiro al tomarlo | `ubicaciones_chofer` (solo la posición del momento; no hay historial) |
| Historial de cumplimiento del chofer y de la zona | `envios.retirado_en` frente a `sla_vence_en` de envíos anteriores |

No entra la "cantidad de entregas pendientes del chofer": un chofer lleva un solo viaje a la vez (`uq_envios_un_viaje_por_chofer`).

## 4. Modelo

El primer modelo sería una **regresión logística** entrenada con los envíos pagos ya cerrados, etiquetados como "retiro a tiempo" o "retiro tarde o sin retiro". Se elige por tres motivos: necesita pocos datos para estabilizarse, devuelve una probabilidad calibrada y sus coeficientes muestran qué variable empuja el riesgo, lo que permite explicarle la alerta al equipo ("riesgo alto por franja de 18 a 20 h y ningún utilitario activo").

La base de comparación es la regla fija que se usaría sin modelo, por ejemplo "quedan menos de 10 minutos para el vencimiento y no hay retiro". El modelo solo se activa si, sobre un conjunto de prueba separado por fecha, detecta más incumplimientos que la regla con la misma cantidad de falsas alarmas.

**Datos para empezar.** Hoy no hay historial suficiente: los envíos de producción son de prueba. El prototipo se entrenaría con envíos generados por un script de simulación (con distribuciones razonables de distancia, franja y demora) para validar el circuito completo; el modelo real se entrena recién con algunos cientos de envíos reales cerrados y se reentrena una vez por mes.

## 5. Cómo se integra

```
pago aprobado / envío tomado
        │
        ▼
evento en outbox_events ──► trabajo pg-boss "estimar-riesgo"
                                   │
                                   ▼
                        servicio de predicción (función pura,
                        coeficientes versionados en el repo)
                                   │
                                   ▼
                    envios.riesgo_retiro + envios.riesgo_factores
                                   │
                                   ▼
              GET /api/envios/panel → nueva alerta "riesgo alto"
```

- Se reutiliza lo que ya existe: el outbox dispara el cálculo, pg-boss lo ejecuta con reintentos y el panel suma la alerta a las tres actuales.
- El cálculo es una función en el backend (`servicios/envios/riesgo.js`) con los coeficientes en un JSON versionado, igual que el cotizador. Entrenar se hace aparte (un script en Python o Node sobre una copia anonimizada de la base) y el resultado se commitea; no hace falta un servicio de ML corriendo.
- Una migración agrega `riesgo_retiro` (numeric) y `riesgo_factores` (jsonb) a `envios`.
- "Todos los pedidos" suma el filtro y el orden por riesgo, con los factores visibles en el detalle.

## 6. Qué muestra al equipo

```text
TRK-2026-000142 · Riesgo de retiro tarde: 82 % (alto)
Plazo: vence en 9 min · Chofer a 6,4 km del retiro
Factores: franja de 18 a 20 h, interurbano, chofer tomó la oferta a los 4 min
Sugerencia: contactar al chofer por el chat del envío
```

Los niveles serían bajo (menos de 40 %), medio (40 a 70 %) y alto (más de 70 %); los cortes se ajustan con los datos reales. Las sugerencias son texto para el equipo: el módulo **no** reasigna envíos ni cambia rutas por su cuenta, porque hoy la asignación la decide el chofer que toma la oferta.

## 7. Alcance del MVP

Incluye: el cálculo en los dos momentos, la columna en `envios`, la alerta en el panel, el filtro en "Todos los pedidos" y una prueba que compare el modelo con la regla fija.

No incluye: reasignación automática, optimización de rutas, predicción de demanda ni cambios en la cotización. Quedan en el [roadmap](ROADMAP.md).

## 8. Riesgos

- **Pocos datos:** con menos de unos cientos de envíos reales, la regla fija es más confiable que el modelo. Por eso el modelo solo reemplaza a la regla si la mejora en la prueba.
- **Sesgo por zona:** el historial por zona puede marcar siempre como riesgosas las mismas zonas. Las alertas no cambian el precio ni la oferta al cliente, solo priorizan la atención del equipo.
- **Datos personales:** el entrenamiento usa una copia anonimizada (sin nombres, direcciones exactas ni teléfonos), coherente con la [política de datos](politica-de-datos.md).
