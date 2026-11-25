# Conclusiones de QA (TP6)

> Cierre del capítulo de **Ingeniería de Software › Verificación y Validación (QA)** de la tesis.
> Integra las [pruebas unitarias](pruebas-unitarias.md) (TP1), el [plan de pruebas](plan-de-pruebas-cotizador.md) (TP2), el [plan de mantenimiento](plan-de-mantenimiento.md) (TP3), la [medición de calidad](medicion-de-calidad.md) (TP4) y las [pruebas de usabilidad](pruebas-de-usabilidad.md) (TP5).

## 1. Recorrido integrador

| TP | Qué medimos | Principal aprendizaje |
|---|---|---|
| TP1 | 98/98 pruebas del cotizador; 97,66 % de sentencias y 91,88 % de ramas; DEF-01. | Los casos de borde encuentran errores reales ("Av. Rivadavia 10000" se rechazaba). |
| TP2 | 12/12 RF trazados; meta ≥ 80 % / 70 %, obtenida 97,66 % / 91,88 %; DEF-03. | Trazar a requerimientos muestra qué falta probar y el umbral vuelve automático el criterio de salida. |
| TP3 | 107/107 pruebas, 98,13 %; cotización ≈ 0,1 ms; 23 vulnerabilidades (2 críticas); DEF-02. | La caracterización detecta cambios silenciosos que una prueba de precio no ve. |
| TP4 | Lighthouse 51 → 62 y SEO 91 → 100; panel 7.529,7 → 180,8 ms; `npm audit` 25 → 2; ESLint 420 → 375. | Medir con volumen cambia el diagnóstico. |
| TP5 | 15/15 tareas completadas, 11 directas; cuestionario reducido 4,00/5. | Modificar peso y bultos fue directo para todos; corregir una respuesta en Boxy y leer el texto fueron las dificultades. |

## 2. Planificado vs. obtenido

- **Alcanzado:** cobertura del cotizador (hoy 98,28 % / 93,14 % con 139 pruebas), 100 % de casos aprobados, 12 RF trazados, cotización en menos de 5 ms y que los tres grupos completen las tareas del TP5.
- **No alcanzado:** quality gate de SonarCloud, protección de la rama `main`, ESLint bloqueante en la CI y refactorización de `cotizarSync` (≈ 245 líneas, complejidad cognitiva 34), Dependabot y CodeQL, y RNF02 en la Web App (LCP de 10,0 s en mobile).
- **Parcial:** Expo actualizado de SDK 54 a 58 sin vulnerabilidades críticas, pero `npm audit` sigue informativo en la CI.
- **Sin medir:** carga y concurrencia (RNF06), disponibilidad en producción (RNF01), rendimiento en el teléfono y pagos con credenciales productivas.
- **Métricas engañosas:** la cobertura del 98 % no cubría la frontera con el servidor (DEF-02); Lighthouse dio 100 en accesibilidad y U5 igual tuvo dificultades para leer.

## 3. Fallos críticos

| Fallo | Detección | Estado | Prueba de regresión |
|---|---|---|---|
| DEF-02: el servidor cobraba el precio que mandaba la app | TP3 | Cerrado (02/11/2026) | `cotizador.test.js` (DEF-02) |
| DEF-03: los barrios se ubicaban en otra ciudad ($102.850 en vez de $6.800) | TP2 | Cerrado | `tarifas.test.ts` (regresión DEF-03) |
| El historial salteaba envíos creados en el mismo milisegundo | CI (commit 4d9ef88) | Cerrado (3276388) | `paginacion.test.js` |

En el TP5 ninguna sesión terminó en un bloqueo: los 5 errores y 4 pedidos de ayuda dieron origen a los tickets US-01 a US-04.

## 4. Qué haríamos distinto

Pruebas de integración de punta a punta desde el TP2 (con un caso malicioso por dato que llega del cliente), datos de prueba con volumen y direcciones reales, casos con fechas iguales, menos herramientas planificadas pero funcionando, y una ronda temprana de usabilidad con personas ajenas al equipo sobre Boxy y el formulario de pago.

El informe completo, con la reflexión final, está en el documento del TP6.
