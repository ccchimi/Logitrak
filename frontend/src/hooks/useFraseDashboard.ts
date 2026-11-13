import { useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

const FRASES = {
  cliente: [
    "¡Hola, {nombre}! ¿Qué vamos a enviar hoy?",
    "{nombre}, tu próximo envío empieza acá.",
    "¿Tenés algo para enviar, {nombre}? Vamos paso a paso.",
    "{nombre}, contame qué necesitás mover hoy.",
    "¡Vamos, {nombre}! Cotizá tu envío con Boxy.",
    "¿Listo para tu próximo envío, {nombre}?",
    "{nombre}, yo te ayudo a organizar tu envío.",
    "Un nuevo destino te espera, {nombre}. ¿Lo cotizamos?",
  ],
  chofer: [
    "Cada viaje cuenta. Revisá tu actividad y seguí creciendo.",
    "Tu esfuerzo suma. Consultá cómo viene tu semana.",
    "Tu próxima ruta empieza con una buena planificación.",
    "Todo tu recorrido, en un solo lugar.",
    "Un viaje a la vez, seguís avanzando.",
    "Consultá tus estadísticas y organizá tu jornada.",
    "Cada entrega merece tu mejor versión. ¡Vamos por más!",
    "Tu dedicación mueve Logitrak. Revisá tus resultados.",
  ],
};

type RolBanner = keyof typeof FRASES;
const ultimoIndice: Record<RolBanner, number> = { cliente: -1, chofer: -1 };

function siguienteIndice(rol: RolBanner) {
  const cantidad = FRASES[rol].length;
  const anterior = ultimoIndice[rol];
  let indice = Math.floor(
    Math.random() * (anterior < 0 ? cantidad : cantidad - 1),
  );
  if (anterior >= 0 && indice >= anterior) indice++;
  ultimoIndice[rol] = indice;
  return indice;
}

export function useFraseDashboard(rol: RolBanner, nombre: string) {
  const enFoco = useIsFocused();
  const [indice, setIndice] = useState(() => siguienteIndice(rol));
  const anterior = useRef({ enFoco, rol });

  useEffect(() => {
    if (enFoco && (!anterior.current.enFoco || anterior.current.rol !== rol)) {
      setIndice(siguienteIndice(rol));
    }
    anterior.current = { enFoco, rol };
  }, [enFoco, rol]);

  return FRASES[rol][indice].replace("{nombre}", nombre.trim() || "Usuario");
}
