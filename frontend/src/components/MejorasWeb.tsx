import { useEffect } from "react";
import { useTema } from "../hooks/useTema";
import { Platform } from "react-native";

export default function MejorasWeb() {
  const tema = useTema();
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = `
      :root { color-scheme: ${tema.claro ? "light" : "dark"}; background: ${tema.colores.fondo}; }
      html, body, #root { height: 100%; overflow: clip; }
      [data-testid="logitrak-root"] { overflow: clip !important; }
      * { box-sizing: border-box; }
      [role="button"], [role="tab"], [role="radio"], button, input, textarea {
        transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
        touch-action: manipulation;
      }
      :is([role="button"], [role="tab"], [role="radio"], button):focus-visible {
        outline: 3px solid ${tema.colores.acento} !important; outline-offset: 4px;
      }
      input:focus, textarea:focus { outline: 2px solid ${tema.colores.acento}; outline-offset: 2px; }
      input, textarea { scroll-margin-block: 100px; }
      @media (hover: hover) {
        :is([role="button"], [role="tab"], [role="radio"], button):not([aria-disabled="true"]):hover {
          filter: brightness(1.1);
        }
      }
      :is([role="button"], [role="tab"], [role="radio"])[aria-disabled="true"] { cursor: not-allowed; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, [tema]);
  return null;
}
