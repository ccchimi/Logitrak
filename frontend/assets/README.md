# Recursos visuales de Logitrak

Fuentes, íconos e ilustraciones que usa la app, con su origen y licencia. Los recursos del rediseño están copiados en el repositorio: ninguno depende de una URL temporal de Canva o de un CDN.

## Fuentes

| Fuente | Dónde está | Uso | Licencia |
|---|---|---|---|
| Poppins 400, 500, 600 y 700 | `fonts/Poppins-*.ttf` | Fuente principal: títulos, textos, formularios y botones (`theme/diseno.ts` y los estilos de cada pantalla) | SIL Open Font License, en `fonts/OFL-Poppins.txt` |
| DM Sans 300 a 700 | Paquete `@expo-google-fonts/dm-sans` | Portada, login, inicio del cliente, avisos emergentes, tarjeta del viaje y mapa web | SIL Open Font License (incluida en el paquete) |
| Syne 400, 700 y 800 | Paquete `@expo-google-fonts/syne` | Se carga al iniciar, pero hoy ninguna pantalla la usa: se puede quitar de `App.tsx` y del `package.json` | SIL Open Font License (incluida en el paquete) |
| Material Icons | `fonts/MaterialIcons.ttf` | Íconos de navegación, formularios y acciones | Apache 2.0, en `fonts/LICENSE-MaterialIcons.txt` ([origen](https://github.com/google/material-design-icons/tree/master/font)) |

Todas se cargan en `App.tsx` con `useFonts` antes de mostrar la primera pantalla. Poppins se eligió por parecido visual con el diseño de Canva, que exporta capturas y no informa la fuente original.

## Íconos de la app

| Archivo | Uso (declarado en `app.json`) |
|---|---|
| `icon.png` | Ícono general de la app |
| `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` | Ícono adaptativo de Android (capas y versión monocromática) |
| `favicon.png` | Ícono de la pestaña en la Web App |

`logo.png` y `splash-icon.png` no están referenciados en el código ni en la configuración: quedaron de la plantilla inicial de Expo y se pueden borrar o usar para la pantalla de carga.

## Imágenes e ilustraciones

| Archivo | Uso | Origen |
|---|---|---|
| `hero-warehouse.webp` | Imagen principal de la portada | Foto de Unsplash, reducida a 1600 px y convertida a WebP (de 831 KB a 243 KB, TP4 de Calidad de Software). La URL original queda en `src/constants/contenidoInicio.ts` |
| `noticias/interfaz.png`, `envio-movil.png`, `cupones.png`, `soporte.png` | Tarjetas de novedades del panel (`components/PanelCanva.tsx`) | Material del rediseño en Canva |
| `illustrations/vehiculos-acceso.png` | Ilustración principal del marco de ingreso y registro (`components/AuthFrame.tsx`) | Rediseño; solo existe en PNG |
| `illustrations/vehicles.png`, `vehicles-mobile.png` (y sus SVG) | Flota vista desde arriba en el mismo marco, en escritorio y en el teléfono | Recreación vectorial de los vehículos de la referencia de diseño |
| `illustrations/metodos-escritorio.png`, `money-mobile.png` (y su SVG) | Marco de las pantallas de métodos de pago y cobro, en escritorio y en el teléfono | Rediseño; la de escritorio solo existe en PNG |
| `illustrations/boxy_sonriente.png`, `boxy_pensandoV2.png` | Personaje Boxy en sus dos estados (`components/BoxyMark.tsx`) | Rediseño; solo rasterizado |

La app usa siempre los PNG, porque React Native no dibuja SVG sin una librería extra. Los SVG de la flota y del cobro son vectoriales y editables. En cambio, `boxy_sonriente.svg` y `boxy_pensandoV2.svg` tienen adentro una imagen PNG aunque su extensión diga otra cosa: no son vectores y no se usan. Para tener a Boxy en vectorial hay que redibujarlo; cambiar la extensión no alcanza.
