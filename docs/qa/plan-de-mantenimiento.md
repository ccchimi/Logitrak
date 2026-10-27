# Plan de Mantenimiento y Estrategia de Pruebas Continuas — Módulo Cotizador de Envíos

> Sección de la memoria de tesis: **Ingeniería de Software › Verificación y Validación (QA)**
> Proyecto: **Logitrak** — plataforma de logística con app móvil (Expo / React Native) y API (Node.js + Express + PostgreSQL/Supabase).
> Continúa las [pruebas unitarias](pruebas-unitarias.md) (TP1) y el [plan de pruebas unificadas](plan-de-pruebas-cotizador.md) (TP2) del mismo módulo.

## Punto de partida

El módulo crítico es el **cotizador de envíos** (`frontend/src/services/botLogistica/`): valida las direcciones y la carga, elige el vehículo y calcula el precio que paga el cliente. En el TP1 y el TP2 lo cubrimos con pruebas unitarias en Jest, trazadas a los requerimientos RF-01 a RF-12, con más del 90 % de cobertura y un defecto encontrado y corregido (DEF-01).

Este plan define cómo vamos a mantener el módulo una vez en producción y cómo esas pruebas pasan a ser una **red de regresión continua**. Parte de lo que se propone ya quedó funcionando en el repositorio (sección 4).

## 1. Plan de mantenimiento del módulo crítico

### 1.1. Mantenimiento correctivo

**Falla de negocio identificada — DEF-02: el servidor confía en el precio que manda la app.**
Al preparar este plan revisamos el camino que recorre el precio después de cotizar y encontramos un defecto real. La cotización se calcula en el teléfono del cliente (`cotizarSync`), y el backend recibe ese precio ya hecho en `POST /api/cotizaciones` y `POST /api/envios`. Lo guarda sin recalcularlo, y después `POST /api/pagos/checkout` cobra exactamente ese importe. En producción esto abre dos fallas:

- **Fraude:** cualquiera que intercepte o arme la petición a mano puede crear un envío de Rosario a CABA con `"precio": 100` y pagarlo así.
- **Precio desactualizado:** si cambiamos una tarifa, los clientes que no actualizaron la app siguen cotizando, y pagando, con la tarifa vieja, porque las tarifas viven dentro de la app (`conocimiento.ts`).

Severidad: **crítica**, porque afecta directamente lo que cobra la empresa. Estado: **abierto**, con la corrección planificada.

**Registro del bug.** Usamos **GitHub Issues** porque el repositorio ya está en GitHub, es gratuito y vincula cada issue con sus commits, su pull request y su ejecución de CI. Cada defecto se carga con una plantilla fija:

| Campo | Ejemplo (DEF-02) |
|---|---|
| Título | `[DEF-02] El backend acepta el precio enviado por el cliente sin recalcularlo` |
| Módulo / versión | Cotizador · API en Render, commit `24095a5` |
| Pasos para reproducir | 1) Iniciar sesión como cliente. 2) Enviar `POST /api/envios` con origen CABA, destino Rosario, 150 kg y `precio: 100`. 3) Pagar el envío. |
| Resultado esperado / obtenido | Esperado: el envío se crea con el precio que calcula el servidor (o se rechaza). Obtenido: se crea y se cobra con precio $100. |
| Severidad / prioridad | Crítica / Alta |
| Evidencia | Respuesta de la API y fila en `envios` |
| Etiquetas | `bug`, `severidad:critica`, `modulo:cotizador` |

**Flujo de corrección sin afectar el entorno funcional.**

1. **Triage:** se confirma el issue, se asigna un responsable y se registra como DEF-02 en el registro de defectos del plan de pruebas.
2. **Rama aislada:** el trabajo se hace en `fix/def-02-precio-servidor`, creada desde `main`. Producción (`main` → Render) no se toca.
3. **Prueba que reproduce el error:** primero se escribe la prueba que describe lo correcto ("si el precio enviado no coincide con el recalculado, el servidor usa el suyo"). Con el código actual tiene que fallar, igual que hicimos con DEF-01.
4. **Corrección:** el cotizador pasa a un paquete compartido que importan la app y el backend. El servidor recalcula la cotización a partir de los datos de la carga y **ignora el precio que manda el cliente**. La app lo sigue usando solo para mostrar el precio al instante.
5. **Regresión completa:** se corre toda la batería en local (el hook *pre-commit* lo hace solo) y en la CI.
6. **Pull request** con `Closes #<n>`: no se puede unir a `main` si la CI no pasa y si no lo revisó otro integrante.
7. **Verificación previa:** la rama se despliega en un servicio de *staging* de Render que apunta a una base de pruebas de Supabase, y ahí se repite el caso del issue.
8. **Despliegue y vuelta atrás:** al unir a `main`, Render despliega automáticamente. Si algo falla, Render permite volver al despliegue anterior con un clic (*rollback*) mientras se investiga.
9. **Cierre:** se cierra el issue, se marca DEF-02 como cerrado y la prueba nueva queda para siempre como **prueba de regresión**.

### 1.2. Mantenimiento adaptativo

**Cambio de entorno: integrar una API externa de rutas para la distancia.**
Hoy la distancia se **estima** en línea recta entre localidades (fórmula de Haversine más un factor de desvío), y la cotización lo avisa con "la distancia se estimó…". El paso natural es calcular la distancia real por calle con una API externa, como **Google Routes API** (el proyecto ya usa Google Maps para el seguimiento). Este cambio depende de un tercero: tiene costo por consulta, puede fallar o demorarse y su contrato puede cambiar de versión.

**Cómo preparamos el módulo:**

- **Puerto y adaptadores:** `estimarDistancia` pasa a ser una implementación de una interfaz `ProveedorDistancias` (`distancia(origen, destino) → { km, estimada, detalle }`). El cálculo actual se conserva como `DistanciaHaversine`, y la API externa entra como un segundo adaptador, `DistanciaGoogleRoutes`. El cotizador depende de la interfaz y no de Google.
- **Respaldo (*fallback*):** si la API tarda más de 2 s, devuelve error o se agota la cuota, se usa Haversine y la cotización queda marcada como `distanciaEstimada: true`, como hoy.
- **Del lado del servidor:** la consulta a la API se hace desde el backend, que es donde se va a calcular el precio definitivo después de DEF-02. Así la clave de Google no queda dentro de la app (es el pendiente #10 del proyecto).
- **Activación gradual:** una variable de entorno (`PROVEEDOR_DISTANCIAS=haversine|google`) permite encender y apagar la integración sin publicar una versión nueva.
- **Pruebas:** las pruebas unitarias del cotizador usan un proveedor *mock* (`jest.fn()`) que devuelve distancias fijas, así siguen siendo deterministas. Se suman pruebas de **contrato** del adaptador contra respuestas grabadas de la API (éxito, error 429 de cuota y *timeout*). Las pruebas de caracterización (1.4) muestran exactamente qué precios cambian al pasar de distancia estimada a real.

Con el mismo esquema se prepara otro cambio adaptativo previsible: **actualizar Expo SDK / React Native**. Como el cotizador es TypeScript puro y no importa nada de React Native, la batería de pruebas tiene que seguir pasando sin cambios después de la actualización. Si no pasa, la actualización no se integra.

### 1.3. Mantenimiento perfectivo

**Mejora propuesta a partir del feedback de los usuarios:** planteamos el escenario en que, ya en producción, los clientes repiten dos comentarios en las reseñas y en el chat de soporte: "*tarda en darme el precio*" y "*quiero ver si hay una opción más rápida aunque sea más cara*".

- **Rendimiento:** `cotizarEnvio` agrega hoy una **demora artificial de 0,5 a 1 segundo** (`setTimeout`) para simular una consulta al servidor. La mejora es eliminarla, porque el cálculo real tarda muy por debajo de un milisegundo, y **recotizar al instante** cada vez que el cliente corrige un dato en la conversación con Boxy.
- **Experiencia de usuario:** en lugar de mostrar solo el vehículo más barato, mostrar **hasta tres alternativas** (la más económica, la más rápida y la recomendada), cada una con su precio y su ventana de entrega. `seleccionarVehiculo` ya evalúa a todos los candidatos y hoy se queda solo con el más barato.

**Pruebas de esta mejora:** una prueba de **rendimiento con tiempo límite** (`rendimiento.test.ts`, ya incorporada) exige que una cotización tarde en promedio menos de 5 ms. Si un cambio futuro (más localidades, más reglas, la API de rutas) degrada el tiempo, la CI lo marca. Las alternativas se cubren con pruebas unitarias nuevas: el orden por costo, que la más rápida tenga la menor ETA y que no aparezca un vehículo que no puede llevar la carga. Las pruebas de caracterización garantizan que la opción por defecto mantenga el mismo precio que antes.

### 1.4. Mantenimiento preventivo

**Aspecto técnico identificado:** `cotizarSync` es una función de unas **230 líneas** con alrededor de **30 puntos de decisión** (complejidad ciclomática cercana a 30, cuando lo recomendable es no pasar de 10 a 15). En un solo bloque resuelve: validación de direcciones, peso y bultos; peso volumétrico; selección del vehículo; armado del desglose; recargos y seguro; ajuste dinámico; tiempos; puntaje de confianza; advertencias; explicación y SLA. Funciona y está cubierta, pero cada cambio de negocio (una tarifa, un recargo nuevo) obliga a tocar esa función entera, y el riesgo de romper otra regla de paso es alto.

Además, el cotizador **no registra nada**: si una cotización se rechaza (dirección ilegible, carga fuera de rango), no queda ningún rastro, así que no podemos saber qué reglas frustran más a los clientes.

**Acciones preventivas:**

1. **Primero, red de seguridad:** se incorporaron **pruebas de caracterización** (*golden master*, `caracterizacion.test.ts`) que congelan la salida actual de `cotizarSync` (vehículo, precio, desglose y tiempos) para 8 escenarios representativos. Junto con las pruebas del TP1 y el TP2, cualquier diferencia de un solo peso en el resultado hace fallar la batería.
2. **Refactorización por extracción de funciones**, sin cambiar la firma pública: `validarSolicitud`, `calcularPesos`, `armarDesglose`, `aplicarRecargos`, `aplicarAjusteDinamico`, `evaluarConfianza` y `armarExplicacion`. Cada una queda de menos de 40 líneas y con pruebas propias.
3. **Separar el cálculo de la presentación:** los textos (explicación, SLA, advertencias) se arman en un módulo aparte. Eso deja al núcleo de precios listo para reutilizarlo en el backend (corrección de DEF-02).
4. **Registro de rechazos:** cada rechazo emite un evento estructurado (`cotizacion_rechazada`, con el código de problema y sin datos personales) que el backend guarda para analizarlo.
5. **Regla de complejidad en el linter:** ESLint con `complexity: ["error", 15]` y `sonarjs/cognitive-complexity`, para que una función no vuelva a crecer así sin que salte un aviso en la CI.

**Relación con ISO/IEC 25010 (Mantenibilidad):** estas acciones mejoran la **modularidad** (cada regla en su función), la **reusabilidad** (el núcleo de precios compartido entre app y backend), la **analizabilidad** (funciones cortas y rechazos registrados), la **modificabilidad** (cambiar un recargo sin tocar la validación) y la **capacidad de ser probado** (cada parte se prueba por separado).

## 2. Estrategia de pruebas en la fase de mantenimiento (regresión)

### 2.1. Automatización e integración

Las pruebas corren en cuatro momentos, de lo más rápido a lo más completo:

| Momento | Qué se corre | Cómo | Estado |
|---|---|---|---|
| Mientras se programa | Las pruebas afectadas por el archivo que se guardó | `npm run test:watch` | Disponible desde el TP1 |
| Antes de cada commit | Solo las pruebas relacionadas con los archivos del cotizador que se modificaron (**regresión selectiva**) | Hook de Git `.githooks/pre-commit` con `jest --findRelatedTests`. Si una falla, el commit se frena. | **Implementado** |
| En cada push y pull request a `main` | **Toda la batería** con cobertura (**regresión completa**), más `npm audit` de dependencias | GitHub Actions, `.github/workflows/ci.yml` | **Implementado** |
| Una vez por semana (lunes 03:00) | Toda la batería, aunque no haya cambios | El mismo workflow con `schedule` (cron) | **Implementado** |

**Por qué regresión completa en la CI:** la batería entera tarda menos de 10 segundos, así que no conviene elegir un subconjunto. En el commit sí usamos la selectiva para no frenar al que programa.

**Por qué una ejecución programada:** el cotizador depende de la fecha (franjas horarias, días de la semana) y de dependencias de npm que se actualizan. La corrida semanal detecta una rotura aunque nadie haya tocado el código. También revisa las PR que abre **Dependabot** cuando aparece una versión nueva de una dependencia.

**Reglas sobre `main`** (configuración de GitHub y Render):

- *Branch protection* en `main`: no se permite el push directo. Todo entra por pull request, con el check **"Pruebas unitarias y cobertura (frontend)"** en verde y la aprobación de al menos un integrante.
- Render despliega automáticamente desde `main`, configurado para esperar a que pasen los checks de la CI. Así **solo llega a producción código que pasó la regresión**.
- Cada corrección (correctiva o no) agrega **al menos una prueba que habría detectado el problema**, y esa prueba no se borra.

### 2.2. Criterios de calidad y mantenibilidad

**Cobertura mínima para aprobar un cambio:**

| Criterio | Umbral | Cómo se controla |
|---|---|---|
| Cobertura global del módulo | ≥ 80 % sentencias, funciones y líneas · ≥ 70 % ramas | `coverageThreshold` de Jest: si no se alcanza, `npm run test:coverage` falla y la CI queda en rojo |
| Cobertura del **código nuevo o modificado** en la PR | ≥ 90 % líneas · ≥ 80 % ramas | *Quality gate* de SonarCloud sobre la PR |
| Variación de la cobertura global | No puede bajar respecto de `main` | Reporte de cobertura de la CI comparado con el de `main` |
| Pruebas | 100 % aprobadas y 0 omitidas (`it.skip`) | CI |
| Requerimientos | 100 % de RF-01 a RF-12 (y los nuevos) con al menos un caso trazado | Matriz de trazabilidad del TP2, actualizada en la misma PR |

La cobertura global actual (ver evidencia) supera con margen el mínimo. Al código nuevo le exigimos más que al global porque es donde aparecen los errores, y es más fácil escribir las pruebas mientras se programa que después.

**Herramientas de análisis estático antes de desplegar un mantenimiento:**

| Herramienta | Qué detecta | Dónde corre |
|---|---|---|
| **TypeScript en modo `strict`** (`tsc --noEmit`) | Errores de tipos, nulos sin controlar, propiedades inexistentes | Local y CI |
| **ESLint** con `typescript-eslint` y `eslint-plugin-sonarjs` | Malas prácticas, variables sin usar, funciones demasiado complejas (`complexity`, `cognitive-complexity`), código duplicado dentro de un archivo | Editor, *pre-commit* y CI |
| **SonarCloud** (gratuito para repositorios públicos) | Código duplicado entre archivos, *code smells*, **deuda técnica** estimada en horas, *security hotspots* y cobertura del código nuevo (*quality gate*) | En cada PR, como check obligatorio |
| **GitHub CodeQL** | Vulnerabilidades de seguridad en JS/TS (inyecciones, datos sin validar), sobre todo en el backend | En cada PR y semanal |
| **npm audit** + **Dependabot** | Dependencias con vulnerabilidades conocidas y versiones desactualizadas | CI (implementado, por ahora informativo) y PRs semanales |
| **Revisión de código entre pares** | Lo que las herramientas no ven: reglas de negocio mal entendidas, nombres confusos, falta de pruebas | Obligatoria en cada PR |

Un mantenimiento **no se despliega** si alguna de estas herramientas marca un problema bloqueante: un error de tipos, un error de ESLint, el *quality gate* de SonarCloud en rojo o una vulnerabilidad crítica.

**Hallazgo de la primera ejecución de la CI.** La primera corrida del pipeline en GitHub aprobó las 107 pruebas, pero `npm audit` encontró **23 vulnerabilidades en dependencias** (2 críticas, 11 altas y 10 moderadas) y dejó la ejecución en rojo. Las dos críticas son `tar` y `shell-quote`, que no son código nuestro: las trae el CLI de Expo (`expo › @expo/cli › tar`) y las herramientas de depuración de React Native (`react-native › react-devtools-core › shell-quote`). Se usan para compilar y desarrollar, no viajan dentro de la app que instala el cliente. Para no frenar todos los cambios por un problema externo, el paso quedó **informativo** (`continue-on-error`): la CI sigue mostrando el reporte, pero no bloquea. La corrección es un **mantenimiento adaptativo**: actualizar Expo SDK y React Native (punto 1.2), con la batería de regresión como garantía. Cuando la auditoría quede limpia, el paso vuelve a ser bloqueante para las vulnerabilidades críticas.

## 3. Matriz unificada de mantenimiento y testing

| Tipo de mantenimiento | Escenario / cambio planteado | Pruebas a ejecutar / diseñar | Herramientas / estrategia de verificación |
|---|---|---|---|
| **Correctivo** | DEF-02: el backend acepta el precio que manda la app sin recalcularlo; un cliente puede pagar menos de lo que corresponde o con una tarifa vieja. | Prueba que reproduce el error (falla antes de la corrección) y queda como **regresión**. Pruebas unitarias del recálculo en el servidor (precio manipulado, precio correcto, carga inválida). Regresión completa de la batería. | Jest · **GitHub Issues** (plantilla de bug, `Closes #n`) · rama `fix/` · PR con CI y revisión · *staging* en Render · *rollback* de Render. |
| **Adaptativo** | Integración con **Google Routes API** para la distancia real por calle, con respaldo en Haversine. Actualización de Expo SDK. | Pruebas unitarias con **mock** del `ProveedorDistancias`. Pruebas de **contrato** del adaptador con respuestas grabadas (éxito, 429, *timeout*). Pruebas de caracterización para ver qué precios cambian. | Jest (`jest.fn`, *fake timers*) · variable de entorno para activar el proveedor · ambiente de pruebas aislado (Render *staging* + base Supabase de prueba). |
| **Perfectivo** | Quitar la demora simulada de 0,5–1 s y recotizar al instante. Mostrar hasta 3 alternativas de vehículo (más económica, más rápida, recomendada). | **Prueba de rendimiento con tiempo límite** (< 5 ms por cotización). Pruebas unitarias del ranking de alternativas. Caracterización para asegurar que la opción por defecto no cambie de precio. | Jest + `performance.now()` · CI en cada PR · *profiler* de Node (`--cpu-prof`) si el tiempo empeora. |
| **Preventivo** | Refactorizar `cotizarSync` (≈ 230 líneas, complejidad ≈ 30) en funciones chicas y separar cálculo de presentación. Registrar las cotizaciones rechazadas. | **Pruebas de caracterización** (*golden master*) más las 98 pruebas existentes: la salida no puede variar ni un peso. Pruebas unitarias nuevas por cada función extraída. | ESLint (`complexity`, `sonarjs`) · **SonarCloud** (duplicación, deuda técnica) · revisión de código entre pares · ISO/IEC 25010 (mantenibilidad). |

## 4. Estado de implementación

| Elemento | Archivo | Estado |
|---|---|---|
| Pipeline de CI (tests, cobertura, `npm audit`, ejecución semanal) | `.github/workflows/ci.yml` | Implementado (la auditoría, informativa hasta actualizar Expo) |
| Hook *pre-commit* con regresión selectiva | `.githooks/pre-commit` (se activa con `git config core.hooksPath .githooks`) | Implementado |
| Pruebas de caracterización de `cotizarSync` (8 escenarios) | `__tests__/caracterizacion.test.ts` | Implementado |
| Prueba de rendimiento con tiempo límite | `__tests__/rendimiento.test.ts` | Implementado |
| Umbral de cobertura que hace fallar la ejecución | `frontend/jest.config.js` (desde el TP2) | Implementado |
| Branch protection en `main` y auto-deploy de Render condicionado a la CI | Configuración de GitHub / Render | Pendiente (configuración, sin código) |
| ESLint, SonarCloud, CodeQL y Dependabot | — | Planificado |
| Actualización de Expo SDK para eliminar las vulnerabilidades críticas de `tar` y `shell-quote` | `frontend/package.json` | Planificado (mantenimiento adaptativo) |
| Corrección de DEF-02, adaptador de distancias, alternativas de vehículo y refactorización | — | Planificado (este plan) |

### Resultado de la ejecución

Ejecutado el 27/10/2026 con `npx jest --ci --coverage` en `frontend/`, el mismo comando que corre la CI. La salida completa está en [evidencias/ejecucion-tests-tp3.txt](evidencias/ejecucion-tests-tp3.txt).

| Indicador | TP2 | TP3 |
|---|---|---|
| Suites / casos aprobados | 4 / 98 | **6 / 107** (+8 de caracterización, +1 de rendimiento) |
| Cobertura de sentencias | 97,66 % | **98,13 %** |
| Cobertura de ramas | 91,88 % | **93,16 %** |
| Cobertura de funciones | 100 % | **100 %** |
| Cobertura de líneas | 98,11 % | **98,38 %** |
| Tiempo promedio de una cotización | — | **≈ 0,1 ms** (presupuesto: 5 ms) |

**Prueba de que la red de caracterización funciona.** Cambiamos a propósito la tarifa por km de la moto de $95 a $96 y corrimos la batería. El precio final de la cotización de documentos **no cambió** ($3500, por el redondeo a múltiplos de $50), así que la prueba del TP1, que compara solo el precio, seguía pasando. Pero la prueba de caracterización **falló**, porque el desglose sí cambió: el recorrido pasó de $732 a $739 y el ajuste por demanda de $318 a $319. Volvimos el valor atrás y la batería quedó de nuevo en 107 / 107. Ese es justamente el tipo de cambio silencioso que una refactorización podría introducir sin que nadie lo note.

El hook *pre-commit* se probó con un cambio en `cargas.ts`: `jest --findRelatedTests` corrió solo las 4 suites que dependen de ese archivo (55 casos), en lugar de las 6.

Además corregimos un detalle de las pruebas del TP1: el título de los casos de `extraerNumero` se mostraba como `"3,5 kg" → NaN` por un formato `%d` mal aplicado. Ahora se lee `"3,5 kg" (peso) → 3.5`.
