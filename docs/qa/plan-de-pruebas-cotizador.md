# Plan de Pruebas Unitarias — Módulo Cotizador de Envíos

> Sección de la memoria de tesis: **Ingeniería de Software › Verificación y Validación (QA)**
> Proyecto: **Logitrak** — plataforma de logística con app móvil (Expo / React Native) y API (Node.js + PostgreSQL/Supabase).
> Este plan es la hoja de ruta técnica previa a la codificación y ejecución de las pruebas unitarias del módulo.

## 1. Plan de pruebas

| Sección | Contenido aplicado al proyecto |
|---|---|
| **Módulo a evaluar** | **Cotizador de envíos** del asistente logístico (`frontend/src/services/botLogistica/`). Es el módulo crítico del sistema: a partir de lo que escribe el cliente (direcciones de retiro y entrega, peso, bultos, dimensiones y descripción de la carga) valida los datos, elige el vehículo de la flota y calcula el **precio que se le cobra al cliente** y el pago al chofer. Lo componen: `tarifas.ts` (cálculo de la cotización), `direcciones.ts` (validación y análisis de direcciones), `cargas.ts` (clasificación del tipo de carga) y `nlp.ts` (normalización de texto, similitud y extracción de números). |
| **Objetivo de las pruebas** | Verificar, de forma aislada y automatizada, que las reglas de negocio de la cotización producen resultados **correctos y reproducibles**: que el precio se calcule según la tarifa de cada vehículo, que se elija la unidad más barata que cumpla los requisitos de la carga, que se apliquen los recargos (tipo de carga, peajes, seguro, franja horaria, día y demanda) y que **se rechacen los datos inválidos** antes de emitir un precio. Un error en este módulo impacta directamente en lo que paga el cliente y cobra el chofer. |
| **Alcance — In Scope** | • `cotizarSync` / `cotizarEnvio`: flujo completo de cotización y respuestas de error.<br>• `seleccionarVehiculo`: límites de capacidad (kg, bultos, volumen) y capacidades especiales (cadena de frío, carga voluminosa, mercancía peligrosa).<br>• `calcularFactoresContexto`: multiplicadores por franja horaria, día de la semana y demanda de la plaza.<br>• `estimarTiempos`: ETA de retiro, tiempo de viaje y ventana de entrega.<br>• `analizarDireccion`, `resolverLocalidad`, `esMismaDireccion`, `estimarDistancia`, `distanciaHaversineKm`.<br>• `clasificarCarga`: categoría, recargo y capacidad requerida.<br>• Utilidades de `nlp.ts`: `normalizar`, `levenshtein`, `similitud`, `extraerNumero`, detección de texto de prueba / ilegible, afirmaciones y negaciones. |
| **Alcance — Out of Scope (dependencias a aislar)** | • **Reloj del sistema** (`new Date()`): se inyecta una fecha fija en `solicitud.fecha` para que los multiplicadores horarios sean deterministas.<br>• **Temporizador** de la latencia simulada de `cotizarEnvio` (`setTimeout`): se reemplaza con *fake timers* de Jest.<br>• **Aleatoriedad** (`Math.random` en el id de cotización y la latencia): no se compara el id ni el tiempo exacto.<br>• Interfaz de usuario (pantallas React Native), conversación del bot (`conversacion.ts`), backend Express, base de datos Supabase y pasarelas de pago (Mercado Pago, MODO): se cubren con pruebas de integración / sistema, no en este plan.<br>• El catálogo de flota, localidades y categorías (`conocimiento.ts`) se usa **real** porque es configuración estática sin efectos secundarios. |
| **Requerimientos a validar** | Ver detalle y trazabilidad en la sección 2.<br>**RF-01** Calcular el precio como base + kg facturables + bultos + km, redondeado a múltiplos de $50.<br>**RF-02** Usar como peso facturable el mayor entre peso real y volumétrico (cm³ / 5000).<br>**RF-03** Asignar el vehículo de menor costo que soporte peso, bultos, volumen y capacidad especial.<br>**RF-04** Aplicar recargo porcentual según el tipo de carga.<br>**RF-05** Sumar peajes en tramos interurbanos (> 50 km).<br>**RF-06** Sumar seguro del 1,2 % sobre el valor declarado.<br>**RF-07** Ajustar la tarifa por franja horaria, día de la semana y demanda de la plaza.<br>**RF-08** Rechazar direcciones vacías, cortas, de prueba o ilegibles.<br>**RF-09** Rechazar cuando origen y destino son el mismo lugar.<br>**RF-10** Validar peso (0,05 – 12.000 kg) y bultos (1 – 200).<br>**RF-11** Estimar distancia entre localidades y ETA / ventana de entrega.<br>**RF-12** Interpretar texto libre: corregir localidades mal escritas, extraer números con unidades, reconocer sí/no. |
| **Estrategia de pruebas unitarias** | • **Framework:** Jest 29 con `ts-jest` (el módulo está escrito en TypeScript), entorno `node` porque la lógica no depende de React Native.<br>• **Mocking / aislamiento:** `jest.useFakeTimers()` para la latencia simulada; inyección de dependencia de la fecha (`solicitud.fecha`) en lugar de mockear `Date`. No hace falta mockear red ni base de datos porque el módulo es lógica pura.<br>• **Técnicas de diseño de casos:**<br>  – *Flujo normal (camino feliz):* cotizaciones urbanas, interurbanas, con carga especial y con seguro, verificando el precio calculado a mano.<br>  – *Valores límite:* peso 0,05 / 12.000 / 12.001 kg; 200 / 201 bultos; moto con 6 kg vs 6,01 kg y 2 vs 3 bultos; ETA máxima de 40 min.<br>  – *Particiones de equivalencia:* cada categoría de carga, cada franja horaria y tipo de día.<br>  – *Casos de error / excepción:* peso `0`, negativo, `NaN`, `Infinity`; direcciones vacías, de prueba o ilegibles; origen igual a destino; carga que no entra en ninguna unidad.<br>  – *Tablas de datos* con `it.each` para cubrir muchas entradas con el mismo test.<br>• **Organización:** carpeta `__tests__/` junto al código, un archivo `<modulo>.test.ts` por archivo fuente, `describe` por función e `it` por regla. |
| **Criterios de entrada** | • El código del módulo compila sin errores de TypeScript (`strict`).<br>• Dependencias instaladas (`npm install` en `frontend/`) y Jest configurado (`jest.config.js`).<br>• Reglas de negocio documentadas (tarifas de flota y parámetros en `conocimiento.ts`).<br>• Casos de prueba diseñados y trazados a requerimientos (sección 2). |
| **Criterios de salida** | • **100 % de los casos de prueba ejecutados y aprobados** (`npm test` sin fallas).<br>• Se alcanza el umbral de cobertura configurado en Jest; si no se alcanza, el comando falla.<br>• Los 12 requerimientos tienen al menos un caso de camino feliz y uno de borde/error.<br>• Todo defecto encontrado queda registrado con su causa y decisión (corregir / aceptar). |
| **Cobertura esperada** | • **Código:** mínimo **80 % de sentencias, funciones y líneas y 70 % de ramas** sobre `tarifas.ts`, `cargas.ts`, `direcciones.ts` y `nlp.ts` (exigido por `coverageThreshold`). Meta deseada: > 90 %.<br>• **Requerimientos:** **100 %** de los requerimientos funcionales RF-01 a RF-12 validados. |

## 2. Trazabilidad requerimiento → casos de prueba

| Req. | Casos de prueba (archivo › describe › it) |
|---|---|
| RF-01 | `tarifas.test.ts` › camino feliz › *cotiza un envío urbano de documentos con moto y el precio calculado a mano*; *el precio final es la suma del desglose redondeada a múltiplos de $50* |
| RF-02 | `tarifas.test.ts` › *usa el peso volumétrico cuando supera al peso real* |
| RF-03 | `tarifas.test.ts` › `seleccionarVehiculo` (4 casos, incluye límites de la moto y `null`); *asigna un vehículo con cadena de frío*; *rechaza cuando ninguna unidad soporta el volumen* |
| RF-04 | `cargas.test.ts` (8 categorías + carga general); `tarifas.test.ts` › *aplica recargo por tipo de carga…* |
| RF-05 | `tarifas.test.ts` › *suma peajes en tramos interurbanos* |
| RF-06 | `tarifas.test.ts` › *aplica recargo por tipo de carga y seguro por valor declarado* |
| RF-07 | `tarifas.test.ts` › `calcularFactoresContexto` (4 casos); *encarece la tarifa en domingo y hora pico* |
| RF-08 | `direcciones.test.ts` › *marca como inválida…* (7 entradas), *acepta alturas reales con dígitos repetidos*; `nlp.test.ts` › *no marca como ilegible… dígitos repetidos* (3 entradas); `tarifas.test.ts` › *rechaza direcciones vacías*, *rechaza textos de prueba*, *cotiza direcciones con alturas de dígitos repetidos (regresión DEF-01)* |
| RF-09 | `tarifas.test.ts` › *rechaza cuando origen y destino son la misma dirección*; `direcciones.test.ts` › `esMismaDireccion` |
| RF-10 | `tarifas.test.ts` › *rechaza peso…* (5 entradas), *acepta el peso mínimo*, *acepta 12.000 y rechaza 12.001 kg*, *acepta 200 bultos y rechaza 201*, *normaliza bultos inválidos a 1* |
| RF-11 | `direcciones.test.ts` › distancias (4 casos); `tarifas.test.ts` › `estimarTiempos` (4 casos) |
| RF-12 | `nlp.test.ts` (normalización, Levenshtein, extracción de números, sí/no); `direcciones.test.ts` › *corrige localidades mal escritas* |

## 3. Resultado de la ejecución

Ejecutado el 15/10/2026 con `npm run test:coverage` en `frontend/` (salida completa en [evidencias/ejecucion-tests.txt](evidencias/ejecucion-tests.txt)).

| Indicador | Meta | Obtenido |
|---|---|---|
| Casos ejecutados / aprobados | 100 % | **98 / 98** |
| Requerimientos validados | 100 % | **12 / 12** |
| Cobertura de sentencias | ≥ 80 % | **97,66 %** |
| Cobertura de ramas | ≥ 70 % | **91,88 %** |
| Cobertura de funciones | ≥ 80 % | **100 %** |
| Cobertura de líneas | ≥ 80 % | **98,11 %** |

### Defectos detectados

| Id | Descripción | Severidad | Estado |
|---|---|---|---|
| DEF-01 | `esTextoIlegible` (`nlp.ts`) marcaba como ilegible cualquier texto con 4 caracteres iguales seguidos, incluidas las **alturas de calle** como `1111`, `10000` o `40000`. Por eso una dirección real como *"Av. Rivadavia 10000, CABA"* se rechazaba con "No puedo reconocer una dirección" y no se podía cotizar. Se detectó al diseñar el caso de altura implausible. | Media | **Cerrado** — la regla de repetición ahora aplica solo a letras (`/(.)\1{3,}/` → `/([a-zñ])\1{3,}/`). |

#### Ciclo de corrección del DEF-01

1. **Reproducción:** se agregaron 6 pruebas de regresión que describen el comportamiento correcto: 3 en `nlp.test.ts` (textos con dígitos repetidos no son ilegibles), 2 en `direcciones.test.ts` (*"Av. Rivadavia 10000, CABA"* queda *verificada* y *"Av. Rivadavia 40000, CABA"* recibe la advertencia `altura_implausible` en lugar de rechazarse) y 1 en `tarifas.test.ts` (la cotización a esa dirección es exitosa).
2. **Verificación de la falla:** con el código original, las 6 pruebas nuevas **fallaron** y las 92 existentes pasaron (`Tests: 6 failed, 92 passed, 98 total`).
3. **Corrección:** cambio de una línea en `esTextoIlegible`.
4. **Re-ejecución:** **98 / 98** pruebas aprobadas. Las pruebas que siguen detectando texto basura con letras repetidas (`aaaaaa`) o solo números (`123456 7890`) siguen pasando, así que el cambio no rompió esa regla.
