# Recursos visuales de Logitrak

- `fonts/Poppins-*.ttf`: Google Fonts, familia Poppins, pesos 400/500/600/700. Licencia SIL Open Font License incluida en `fonts/OFL-Poppins.txt`. La familia se eligió por correspondencia visual: Canva contiene capturas y no expone la fuente interna del mockup.
- `fonts/MaterialIcons.ttf`: Google Material Icons, iconografía consistente para navegación, formularios y acciones. Licencia Apache 2.0 incluida en `fonts/LICENSE-MaterialIcons.txt`. Fuente: https://github.com/google/material-design-icons/tree/master/font
- `hero-warehouse.jpg`: copia local de la imagen de Unsplash que el proyecto ya usaba como `HERO_IMAGE`; se conserva su URL de origen en `src/constants/contenidoInicio.ts`. Fuente: https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d
- `illustrations/vehicles.svg`, `vehicles-mobile.svg`: recreaciones vectoriales de los vehículos cenitales de la referencia. PNG equivalentes para compatibilidad con React Native nativo.
- `illustrations/boxy_sonriente.png`, `boxy_pensandoV2.png`: variantes rasterizadas del personaje Boxy. Los archivos `boxy_sonriente.svg` y `boxy_pensandoV2.svg` también contienen datos PNG pese a su extensión; no son originales vectoriales editables. No existe un recurso llamado `boxy.svg`.
- `illustrations/money-mobile.svg` y `money-mobile.png`: ilustración de cobro/pago móvil en formatos vectorial y rasterizado.
- `illustrations/metodos-escritorio.png`: ilustración de métodos para escritorio. No hay un SVG equivalente versionado ni un recurso llamado `money.svg`.
- `illustrations/vehiculos-acceso.png`: ilustración de vehículos del marco `src/components/AuthFrame.tsx`, que usan las pantallas de inicio de sesión, registro, recuperación y métodos de pago. Solo existe en PNG; no hay un SVG equivalente versionado.

Los archivos `vehicles.svg`, `vehicles-mobile.svg` y `money-mobile.svg` contienen SVG editables y tienen versiones PNG. Las variantes de Boxy con extensión `.svg` son PNG y requieren corregir su formato o extensión en una tarea de recursos; cambiar solo la extensión no las convierte en vectores. La aplicación utiliza los PNG sin un renderizador SVG adicional. Los recursos esenciales del rediseño no dependen de URLs temporales de Canva o CDN.
