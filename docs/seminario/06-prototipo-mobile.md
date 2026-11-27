# 6. Prototipo de interfaz de usuario mobile

Prototipo interactivo de la app móvil hecho en el Parcial 1, con las decisiones propias del teléfono y cómo quedaron en la app.

- **Prototipo interactivo (Figma):** [Mobile UI — Prototipo Logitrak](https://www.figma.com/make/RTS7jedycDXmHSTTxqipEK/Mobile-UI---Prototipo-Logitrak?fullscreen=1&t=p7phlFFR9xjxd6Vm-1&code-node-id=0-6)
- **App instalable:** se compila con Expo para Android e iOS desde el mismo código que la Web App. Cómo instalarla: [manual de instalación](15-manual-de-instalacion.md#paso-5-app-móvil-opcional).

## Decisiones propias del teléfono

| Decisión del prototipo | Por qué | Cómo quedó |
|---|---|---|
| **Postulación como chofer solo en el teléfono** | Necesita la cámara para el DNI y la selfie | La postulación (`TrabajaConNosotrosScreen.tsx`) se puede iniciar también desde la web para no bloquear el alta, pero el escaneo del DNI y la prueba de vida funcionan en el teléfono |
| **Estado Online / Offline del chofer visible en el panel** | Que el chofer controle si recibe pedidos | Interruptor en la consola del chofer que pausa la búsqueda de ofertas. La disponibilidad no se guarda en el servidor: el envío lo toma el primer chofer compatible que acepta |
| **Recorrido corto del chofer:** Online → envíos → envío → estado | Se usa mientras maneja: pocas acciones y grandes | La consola muestra la oferta con su pago, un botón para tomarla y, en viaje, un único botón para avanzar al siguiente paso |
| **Paneles con accesos a cada sección** | Evitar una navegación lineal | Menú inferior con las secciones de cada rol |

## Recorrido del chofer en la app

```
Panel de chofer (disponible) → Envíos disponibles → Tomar envío
  → En el punto de retiro → Paquete retirado → Entrega con PIN y foto
Panel de chofer → Estadísticas | Método de cobro | Perfil
Perfil de cliente → Postularme como chofer → DNI y selfie → Alta como chofer
```

## Del prototipo a la implementación

| Sección del prototipo | Pantalla implementada | Diferencias |
|---|---|---|
| Panel de chofer y modo online | `ChoferScreen.tsx` | Suma la ubicación GPS compartida durante el viaje, el chat con el cliente y la reputación del chofer |
| Envío y actualización del estado | `ChoferScreen.tsx` (viaje en curso) y `EntregaModal` | La entrega se cierra con el PIN de quien recibe y una foto de comprobante |
| Estadística | `EstadisticasScreen.tsx` | Ofertas, entregas, porcentaje completado y ganancias de los últimos 7, 30 o 365 días, con el gráfico de entregas de la semana |
| Método de cobro | `MetodosScreen.tsx` | Pantalla de maqueta: todavía no guarda la cuenta ni transfiere el pago (pendiente #22) |
| Postulación | `TrabajaConNosotrosScreen.tsx` | Escaneo del código PDF417 del DNI, selfie y prueba de vida opcional |
| Panel de cliente, Boxy, pago y seguimiento | Las mismas pantallas que la web ([documento 5](05-prototipo-web.md)) | Un solo código para las dos plataformas |

## Funciones que necesitan el teléfono

| Función | Dónde | Estado |
|---|---|---|
| Notificaciones push | Android (FCM) | Funciona; en iOS falta la cuenta de Apple Developer (pendiente #4) |
| Ubicación del chofer con la app abierta | Android e iOS | Funciona |
| Ubicación con la app minimizada | Build nativo | Falta probarla en el teléfono (pendiente #18) |
| Escaneo del DNI y prueba de vida | Build nativo | Falta probarlos con el build de SDK 58 (pendientes #9 y #13) |
| Sesión guardada en el llavero del teléfono | Android e iOS | Funciona (Keystore y Keychain) |
