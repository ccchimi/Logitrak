# 5. Prototipo de interfaz de usuario web

Prototipo interactivo de la versión web hecho en el Parcial 1, con la navegación propuesta y la pantalla real que implementa cada sección.

- **Prototipo interactivo (Figma):** [Web UI — Prototipo Logitrak](https://www.figma.com/make/iz6clxlDgiJ8A66dQkbTvZ/Web-UI---Prototipo-Logitrak?fullscreen=1&t=HLUCvu1SKtFjxM9u-1&code-node-id=0-6)
- **Diseños de UI:** Canva del equipo con los diseños nuevos de Logitrak.
- **Web App funcionando:** [ccchimi.github.io/Logitrak](https://ccchimi.github.io/Logitrak/)

## Navegación propuesta

El recorrido empieza en la portada (Home), que solo existe en la web:

```
Home → Login → Panel según el rol
Home → Registro → Login → Panel según el rol
```

Después de iniciar sesión, cada rol entra a su panel:

```
Panel de cliente → Envío → Boxy → Confirmación y pago → Seguimiento del envío
Panel de cliente → Cuponera | Método de pago | Perfil

Panel de chofer → Modo online → Envíos disponibles → Envío → Actualización del estado
Panel de chofer → Estadística | Método de cobro | Perfil
```

## Del prototipo a la implementación

| Sección del prototipo | Pantalla implementada (`frontend/src/screens`) | Diferencias |
|---|---|---|
| Home (portada) | `Inicio.tsx` | Igual: presentación del servicio y acceso a Login y Registro |
| Login | `LoginScreens.tsx` | Suma el paso del código de dos pasos (equipo) y el de elegir una contraseña nueva cuando se entra con una temporal |
| Register | `RegistroScreen.tsx` | Avisa mientras se escribe si el usuario está tomado |
| — | `RecuperarScreen.tsx` | No estaba en el prototipo: pedido de recuperación a soporte |
| Panel de cliente | `HomeScreen.tsx` | Boxy integrado en el propio panel, con la lista de envíos, filtros y búsqueda |
| Envío y Boxy IA | `HomeScreen.tsx`, `SolicitudEnvioScreen.tsx` | La cotización aparece como una tarjeta desglosada dentro de la conversación |
| Confirmación y pago | `PagoScreen.tsx` | Mercado Pago (link y QR), tarjeta y cupones |
| Seguimiento del envío | `SeguimientoScreen.tsx`, `DetalleEnvioScreen.tsx` | Suma el PIN de entrega, el chat con el chofer, el comprobante en PDF y la calificación |
| Cuponera | `CuponeraScreen.tsx` | Igual, con el vencimiento de cada cupón |
| Método de pago | `MetodosScreen.tsx` | Pantalla de maqueta: avisa que todavía no guarda tarjetas (pendiente #22) |
| Perfil | `PerfilScreen.tsx` | Suma preferencias, verificación en dos pasos, descarga de datos y eliminación de la cuenta |
| Panel de chofer | `ChoferScreen.tsx` | Igual, con el interruptor para pausar las ofertas (ver el documento 6) |
| — | `HistorialScreen.tsx`, `NotificacionesScreen.tsx`, `SoporteScreen.tsx`, `ChatEnvioScreen.tsx` | No estaban en el prototipo; surgieron con los requerimientos RF12, RF15, RF13 y el módulo de soporte |
| — | `AdminDashboardScreen.tsx`, `TodosPedidosScreen.tsx`, `UsuariosAdminScreen.tsx` | El panel del equipo (RF17) no se prototipó; se diseñó durante la implementación |

## Decisiones de diseño que se mantuvieron

- **Un panel por rol** como punto central de navegación: el usuario vuelve al panel y accede a otra función sin recorrer todo el flujo.
- **Boxy dentro del flujo del cliente**, no como una herramienta aparte.
- **Funciones de consulta separadas del flujo principal** (cuponera, perfil, métodos), para no distraer del envío.
- **Diseño responsive:** en pantallas anchas se muestra el menú lateral y las tablas; en angostas, el menú inferior y tarjetas (RNF04).
