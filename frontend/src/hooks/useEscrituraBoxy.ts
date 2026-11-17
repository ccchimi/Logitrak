import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ChatMessage } from "../components/boxy/MensajeChat";
import type { Cotizacion } from "../services/botLogistica";
import { createId } from "../helpers/pasosSolicitudEnvio";
import { useMovimientoReducido } from "./useMovimientoReducido";

const MS_POR_LETRA = 14;

type TipeoEnCurso = { id: string; texto: string; resolver: () => void };
type EsperaEnCurso = { timer: ReturnType<typeof setTimeout>; resolver: () => void };

export function useEscrituraBoxy() {
  const reducido = useMovimientoReducido();
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [pensando, setPensando] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipeoEnCurso = useRef<TipeoEnCurso | null>(null);
  const esperaEnCurso = useRef<EsperaEnCurso | null>(null);

  const escribir = useCallback(
    (texto: string, kind: ChatMessage["kind"] = "normal", result?: Cotizacion) =>
      new Promise<void>((resolve) => {
        const id = createId("bot");
        if (intervalo.current) clearInterval(intervalo.current);

        if (reducido) {
          setMensajes((prev) => [...prev, { id, sender: "bot", text: texto, kind, result }]);
          setEscribiendo(false);
          resolve();
          return;
        }

        setEscribiendo(true);
        tipeoEnCurso.current = { id, texto, resolver: resolve };
        setMensajes((prev) => [...prev, { id, sender: "bot", text: "", kind, result }]);

        let letras = 0;
        intervalo.current = setInterval(() => {
          letras += 1;
          setMensajes((prev) =>
            prev.map((m) => (m.id === id ? { ...m, text: texto.slice(0, letras) } : m)),
          );
          if (letras >= texto.length) {
            if (intervalo.current) {
              clearInterval(intervalo.current);
              intervalo.current = null;
            }
            tipeoEnCurso.current = null;
            setEscribiendo(false);
            resolve();
          }
        }, MS_POR_LETRA);
      }),
    [reducido],
  );

  const esperar = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const terminar = () => {
          esperaEnCurso.current = null;
          resolve();
        };
        esperaEnCurso.current = { timer: setTimeout(terminar, ms), resolver: terminar };
      }),
    [],
  );

  const saltear = useCallback(() => {
    let salteo = false;

    const espera = esperaEnCurso.current;
    if (espera) {
      clearTimeout(espera.timer);
      espera.resolver();
      salteo = true;
    }

    const tipeo = tipeoEnCurso.current;
    if (tipeo) {
      if (intervalo.current) {
        clearInterval(intervalo.current);
        intervalo.current = null;
      }
      setMensajes((prev) => prev.map((m) => (m.id === tipeo.id ? { ...m, text: tipeo.texto } : m)));
      tipeoEnCurso.current = null;
      setEscribiendo(false);
      tipeo.resolver();
      salteo = true;
    }

    return salteo;
  }, []);

  const agregarPensando = useCallback(() => {
    const id = createId("thinking");
    setPensando(true);
    setMensajes((prev) => [...prev, { id, sender: "bot", text: "Analizando", kind: "thinking" }]);
    return id;
  }, []);

  const quitarPensando = useCallback((id: string) => {
    setMensajes((prev) => prev.filter((m) => m.id !== id));
    setPensando(false);
  }, []);

  const agregarDelUsuario = useCallback((texto: string) => {
    setMensajes((prev) => [...prev, { id: createId("user"), sender: "user", text: texto }]);
  }, []);

  const detenerTimers = useCallback(() => {
    if (intervalo.current) {
      clearInterval(intervalo.current);
      intervalo.current = null;
    }
    if (esperaEnCurso.current) {
      clearTimeout(esperaEnCurso.current.timer);
      esperaEnCurso.current = null;
    }
  }, []);

  const reiniciar = useCallback(() => {
    detenerTimers();
    tipeoEnCurso.current = null;
    setMensajes([]);
    setPensando(false);
    setEscribiendo(false);
  }, [detenerTimers]);

  useEffect(() => detenerTimers, [detenerTimers]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== "Enter" || evento.shiftKey) return;
      if (saltear()) evento.preventDefault();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [saltear]);

  return {
    mensajes,
    pensando,
    escribiendo,
    escribir,
    esperar,
    saltear,
    agregarPensando,
    quitarPensando,
    agregarDelUsuario,
    reiniciar,
  };
}
