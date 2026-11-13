# Recursos visuales de Logitrak

- `fonts/Poppins-*.ttf`: Google Fonts, familia Poppins, pesos 400/500/600/700. Licencia SIL Open Font License incluida en `fonts/OFL-Poppins.txt`. La familia se eligió por correspondencia visual: Canva contiene capturas y no expone la fuente interna del mockup.
- `fonts/MaterialIcons.ttf`: Google Material Icons, iconografía consistente para navegación, formularios y acciones. Licencia Apache 2.0 incluida en `fonts/LICENSE-MaterialIcons.txt`. Fuente: https://github.com/google/material-design-icons/tree/master/font
- `hero-warehouse.jpg`: copia local de la imagen de Unsplash que el proyecto ya usaba como `HERO_IMAGE`; se conserva su URL de origen en `src/constants/contenidoInicio.ts`. Fuente: https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d
- `illustrations/vehicles.svg`, `vehicles-mobile.svg`: recreaciones vectoriales de los vehículos cenitales de la referencia. PNG equivalentes para compatibilidad con React Native nativo.
- `illustrations/boxy.svg`: recreación del personaje cúbico de Boxy, con PNG equivalente. No es un archivo original extraído de Canva.
- `illustrations/money.svg`, `money-mobile.svg`: recreaciones de la ilustración de cobro/pago, con PNG equivalentes.

Los SVG quedan editables. Los PNG son sus exportaciones para la aplicación; no se agregó un renderizador SVG ni otra dependencia al proyecto. Los recursos esenciales del rediseño no dependen de URLs temporales de Canva o CDN.
