# Módulo de Inteligencia Logística Predictiva

## Descripción

Como evolución de Logitrak se propone incorporar un módulo de inteligencia logística predictiva orientado a anticipar posibles demoras en los envíos antes de que ocurra un incumplimiento del SLA.

Actualmente el sistema permite gestionar y monitorear los envíos. Este nuevo módulo busca agregar una capa de análisis que permita detectar operaciones con riesgo y asistir al administrador en la toma de decisiones.

## Problema que resuelve

En un sistema tradicional, una demora puede detectarse cuando el envío ya está atrasado o cuando el SLA ya fue incumplido.

El objetivo de este módulo es anticipar esa situación.

Ejemplo:

> Envío #142 — Riesgo de demora: 82%

De esta manera, el administrador podría intervenir antes de que ocurra el incumplimiento.

## Funcionamiento propuesto

El módulo recibiría información relacionada con cada envío y utilizaría esos datos para estimar una probabilidad de demora.

El flujo general sería:

**Datos del envío → modelo predictivo → nivel de riesgo → alerta → recomendación**

## Datos de entrada

Entre las variables que podrían utilizarse se encuentran:

* Distancia del envío.
* Zona de origen y destino.
* Hora del día.
* Día de la semana.
* Tipo de vehículo.
* Cantidad de entregas pendientes del conductor.
* Tiempo restante para cumplir el SLA.
* Disponibilidad de conductores.
* Duración estimada del recorrido.
* Historial de cumplimiento de entregas.

## Resultado esperado

El modelo devolvería una probabilidad estimada de incumplimiento.

Ejemplo:

```text
Probabilidad de demora: 82%
Nivel de riesgo: ALTO
```

Los niveles podrían clasificarse inicialmente de la siguiente manera:

* Riesgo bajo.
* Riesgo medio.
* Riesgo alto.

## Recomendaciones

Además de mostrar el nivel de riesgo, el sistema podría generar recomendaciones simples para el administrador.

Ejemplos:

* Continuar monitoreando el envío.
* Evaluar reasignación a otro conductor.
* Priorizar el envío.
* Revisar la ruta asignada.
* Contactar al conductor.

En una primera versión, estas acciones serían recomendaciones y no decisiones automáticas.

## Pantalla propuesta

Se propone incorporar una nueva pantalla administrativa denominada:

### Centro de Operaciones Inteligente

Esta vista permitiría identificar rápidamente los envíos con mayor riesgo.

Ejemplo:

```text
Envío #142

Riesgo de demora: 82%
Nivel: ALTO

SLA restante: 48 minutos

Factores detectados:
- Alta carga del conductor.
- Tiempo restante reducido.
- Recorrido de larga distancia.

Recomendación:
Evaluar reasignación del envío.
```

La pantalla podría ordenar los envíos de mayor a menor riesgo para que el administrador pueda priorizar aquellos que requieren atención.

## Inteligencia artificial

La propuesta busca evitar que el nivel de riesgo se determine únicamente mediante reglas fijas.

Por ejemplo, una regla tradicional podría indicar:

```text
Si quedan menos de 30 minutos para el SLA → riesgo alto.
```

En cambio, un modelo de Machine Learning podría analizar simultáneamente distintas variables y aprender de entregas anteriores.

Para un primer prototipo podría utilizarse un modelo de clasificación supervisada, como una regresión logística.

El modelo aprendería a partir de operaciones históricas clasificadas como:

* SLA cumplido.
* SLA incumplido.

Posteriormente podría estimar la probabilidad de incumplimiento de nuevos envíos.

## MVP

Para mantener un alcance realista, la primera versión tendría únicamente las siguientes funcionalidades:

1. Obtener los datos básicos de un envío.
2. Enviar los datos al módulo predictivo.
3. Calcular una probabilidad estimada de demora.
4. Clasificar el riesgo como bajo, medio o alto.
5. Mostrar el resultado al administrador.
6. Mostrar una recomendación operativa.

No se incluirían inicialmente:

* Reasignaciones automáticas.
* Modificación automática de rutas.
* Optimización completa de flota.
* Predicción avanzada de demanda.

Estas funcionalidades quedarían como futuras evoluciones.

## Datos para el prototipo

Debido a que durante el desarrollo inicial puede no existir suficiente información histórica real, el MVP podría validarse utilizando datos simulados.

Estos datos permitirían comprobar:

* El flujo de información.
* La integración con el backend.
* El funcionamiento del modelo.
* La visualización del riesgo.
* La generación de alertas.

En una implementación productiva, el modelo debería entrenarse progresivamente con información real de las operaciones de Logitrak.

## Evolución futura

Una vez validada la predicción de demoras, el módulo podría evolucionar hacia:

* Recomendación inteligente de conductores.
* Reasignación asistida de envíos.
* Optimización de rutas.
* Predicción de demanda.
* Planificación de disponibilidad de flota.
* Identificación de zonas y horarios críticos.

## Objetivo final

El objetivo es que Logitrak evolucione desde un sistema que gestiona y detecta incidencias hacia una plataforma capaz de anticiparlas y asistir en la toma de decisiones.

La evolución puede resumirse en:

**Detectar → Predecir → Recomendar**
