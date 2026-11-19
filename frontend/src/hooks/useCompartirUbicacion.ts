import { useCallback, useEffect, useRef, useState } from "react";
import { publicarUbicacion } from "../services/asignacionesService";
import { pedirPermisoGps, seguirPosicion, type PosicionGps } from "../services/gps";
import { convieneEnviar } from "../helpers/ubicacion";

export type EstadoUbicacion =
  | "inactivo"
  | "pidiendo"
  | "compartiendo"
  | "sin_permiso"
  | "sin_gps"
  | "error";

const LATIDO_MS = 45_000;

/**
 * Mientras `activo` es true (el chofer lleva un envío), sigue el GPS con la
 * app abierta y manda la posición al servidor: cuando se movió 15 m, como
 * mucho cada 8 s, y al menos cada 45 s aunque esté quieto. Al terminar el
 * viaje deja de mirar el GPS; el servidor borra la última posición.
 */
export function useCompartirUbicacion(activo: boolean) {
  const [estado, setEstado] = useState<EstadoUbicacion>("inactivo");
  const [ultimoEnvio, setUltimoEnvio] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);
  const enviadoRef = useRef<{ lat: number; lng: number; en: number } | null>(null);
  const ultimaRef = useRef<PosicionGps | null>(null);
  const enCursoRef = useRef(false);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (!activo) {
      setEstado("inactivo");
      enviadoRef.current = null;
      ultimaRef.current = null;
      return;
    }

    let vigente = true;
    let dejarDeSeguir: (() => void) | null = null;
    let latido: ReturnType<typeof setInterval> | null = null;

    const enviar = async (pos: PosicionGps, forzar = false) => {
      const actual = { lat: pos.lat, lng: pos.lng, en: Date.now() };
      if (!forzar && !convieneEnviar(enviadoRef.current, actual)) return;
      if (enCursoRef.current) return;
      enCursoRef.current = true;
      const r = await publicarUbicacion(pos).finally(() => {
        enCursoRef.current = false;
      });
      if (!vigente) return;
      if (r.exito) {
        enviadoRef.current = actual;
        setUltimoEnvio(actual.en);
        setEstado("compartiendo");
      } else if (r.sinViaje) {
        setEstado("inactivo");
      } else {
        setEstado("error");
      }
    };

    void (async () => {
      setEstado("pidiendo");
      try {
        const permiso = await pedirPermisoGps();
        if (!vigente) return;
        if (permiso !== "concedido") {
          setEstado(permiso === "denegado" ? "sin_permiso" : "sin_gps");
          return;
        }
        const cortar = await seguirPosicion(
          (pos) => {
            ultimaRef.current = pos;
            void enviar(pos);
          },
          () => {
            if (vigente) setEstado("error");
          },
        );
        if (!vigente) {
          cortar();
          return;
        }
        dejarDeSeguir = cortar;
        latido = setInterval(() => {
          const ultima = ultimaRef.current;
          if (ultima && (!enviadoRef.current || Date.now() - enviadoRef.current.en >= LATIDO_MS)) {
            void enviar(ultima, true);
          }
        }, 15_000);
      } catch {
        if (vigente) setEstado("error");
      }
    })();

    return () => {
      vigente = false;
      dejarDeSeguir?.();
      if (latido) clearInterval(latido);
    };
  }, [activo, intento]);

  return { estado, ultimoEnvio, reintentar };
}

export const TEXTO_ESTADO_UBICACION: Record<EstadoUbicacion, string> = {
  inactivo: "",
  pidiendo: "Activando tu ubicación…",
  compartiendo: "El cliente ve tu ubicación mientras dure el viaje.",
  sin_permiso: "No diste permiso de ubicación: el cliente no puede ver dónde estás.",
  sin_gps: "Tenés la ubicación del teléfono apagada: activala para que el cliente te vea.",
  error: "No pudimos compartir tu ubicación. Revisá la conexión y el GPS.",
};
