# Pruebas de usabilidad del cotizador (TP5)

> Sección de la memoria de tesis: **Ingeniería de Software › Verificación y Validación (QA)**
> Continúa la [medición de calidad](medicion-de-calidad.md) (TP4). Sesiones del 21/11/2026, presenciales, con Think Aloud y consentimiento informado.

## 1. Protocolo

| Campo | Detalle |
|---|---|
| Sistema | Logitrak, cotizador de envíos (Boxy): cotización, confirmación del pedido y pago de prueba. |
| Plataforma | Aplicación Android instalada y aplicación web en el navegador (iPhone y computadora). |
| Entorno | Local, versión `3d55aee` (19/11/2026), con una cuenta de prueba y sin cobros reales. |
| Registro | Anotaciones escritas del equipo; sin grabaciones. |

| Tarea | Escenario | Criterio de éxito | Tiempo máximo |
|---|---|---|---|
| T1 | Averiguar cuánto cuesta mandar una caja de libros de 8 kg de CABA (Av. Corrientes 1500) a Rosario (Bv. Oroño 1200). | Cotización con el precio total, origen CABA, destino Rosario y 8 kg. | 5 min |
| T2 | Son dos cajas y pesan 15 kg en total: conseguir el precio correcto. | Nueva cotización con 2 bultos y 15 kg. | 4 min |
| T3 | Dejar el envío pedido y pagarlo con los datos de prueba (no se cobra). | Pago de prueba completo (tarjeta de prueba o Mercado Pago). | 3 min |

Hubo una prueba piloto con una persona independiente (fuera de las métricas): se aclaró el contexto de las tareas, se mantuvo el límite de T2 y se agregó verificar la conexión y la cuenta antes de cada sesión.

## 2. Resultados

| ID | Grupo y edad | Familiaridad | T1 · Cotizar | T2 · Modificar | T3 · Pagar | Cuestionario (1 a 5) |
|---|---|---|---|---|---|---|
| U1 | A · 22 | Alta | Directo (0:46) | Directo (0:32) | Directo (0:23) | 5,00 |
| U2 | A · 18 | Alta | Directo (0:48) | Directo (0:40) | Directo (0:31) | 5,00 |
| U3 | Adicional · 56 | Media | Con dificultad (1:02) | Directo (0:55) | Directo (0:41) | 4,00 |
| U4 | B · 54 | Media | Con dificultad (1:00) | Directo (1:01) | Con dificultad (1:08) | 3,33 |
| U5 | C · 71 | Baja | Con dificultad (1:33) | Directo (1:05) | Directo (1:45) | 2,67 |

| Indicador | T1 | T2 | T3 |
|---|---|---|---|
| Completadas | 5/5 | 5/5 | 5/5 |
| Éxitos directos | 2/5 | 5/5 | 4/5 |
| Errores | 4 | 0 | 1 |
| Solicitudes de ayuda | 3 | 0 | 1 |
| Tiempo promedio | 1:02 | 0:51 | 0:54 |

De 15 tareas: 11 éxitos directos (73,3 %), 4 con dificultad y ninguna falla. El cuestionario reducido (P1 + (6 − P2) + P3) / 3 promedió **4,00**: grupo A 5,00, B 3,33, C 2,67 y el participante adicional 4,00. Con una sola persona en los grupos B y C, las diferencias no permiten atribuir una dificultad a la edad.

## 3. Hallazgos

- **Supuestos refutados:** que conversar con Boxy sería intuitivo para todos (U4 y U5 no sabían cómo retomar después de una respuesta equivocada) y que el tamaño de los textos alcanzaba (U5 tuvo dificultades para leer Boxy y el formulario de tarjeta).
- **ISO/IEC 25010:** ingreso de direcciones y validación de la tarjeta → protección contra errores de usuario; corrección en Boxy → operabilidad; legibilidad → accesibilidad.

## 4. Backlog

| Ticket | Severidad | Evidencia | Propuesta (valor verificable) | Mantenimiento | Criterio de aceptación |
|---|---|---|---|---|---|
| US-01 · Direcciones rechazadas | Mayor | U3, T1 (1:02): dirección rechazada, un pedido de ayuda. | Indicar qué dato revisar (calle, altura o ciudad) y ofrecer hasta 3 direcciones parecidas en botones de al menos 44 × 44 px. | Correctivo | Corregir una dirección inválida sin ayuda y completar T1 en menos de 5 min. |
| US-02 · Corregir respuestas en Boxy | Mayor | U4 y U5, T1 (1:00 y 1:33). | Editar una respuesta anterior tocándola (área ≥ 44 × 44 px) y recotizar: corregir un dato en no más de 2 toques. | Perfectivo | Un usuario del grupo B o C corrige sin reiniciar Boxy y cotiza en menos de 5 min. |
| US-03 · Rechazo de la tarjeta | Mayor | U4, T3 (1:08): dígitos mal cargados, un pedido de ayuda. | Validar el número al escribirlo (Luhn) e indicar qué campo revisar en menos de 1 s, sin mostrar los dígitos. | Correctivo | Con datos de prueba incorrectos, completar T3 en menos de 3 min sin ayuda. |
| US-04 · Legibilidad de Boxy y del pago | Mayor | U5: dificultad para leer los mensajes y el formulario de tarjeta. | Texto ampliable al 200 % sin pérdida de contenido; contraste mínimo 4,5:1. | Perfectivo | Auditoría de ampliación y contraste; repetir T1 y T3 con un usuario del grupo C sin ayuda. |

Las planillas por participante, el guion, el modelo de consentimiento y las respuestas del cuestionario están en los anexos del informe del TP5.
