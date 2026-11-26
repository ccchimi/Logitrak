import { useEffect, useState } from "react";
import { useCompartirUbicacion } from "./useCompartirUbicacion";
import {
  detenerSegundoPlano,
  iniciarSegundoPlano,
  segundoPlanoActivo,
  segundoPlanoSoportado,
} from "../services/gpsSegundoPlano";

/**
 * GPS del chofer mientras lleva un envío: comparte la ubicación con la app
 * abierta y, si el chofer lo activa, también con la app minimizada. Cuando no
 * hay viaje, el seguimiento en segundo plano se apaga.
 */
export function useGpsDelViaje(envioCodigo: string | null | undefined) {
  const ubicacion = useCompartirUbicacion(Boolean(envioCodigo));
  const [enSegundoPlano, setEnSegundoPlano] = useState(false);
  const [avisoSegundoPlano, setAvisoSegundoPlano] = useState("");

  useEffect(() => {
    if (!segundoPlanoSoportado) return;
    if (!envioCodigo) {
      void detenerSegundoPlano().then(() => setEnSegundoPlano(false));
      return;
    }
    void segundoPlanoActivo().then(setEnSegundoPlano);
  }, [envioCodigo]);

  const cambiarSegundoPlano = async (activar: boolean) => {
    setAvisoSegundoPlano("");
    if (!activar) {
      await detenerSegundoPlano();
      setEnSegundoPlano(false);
      return;
    }
    const r = await iniciarSegundoPlano();
    setEnSegundoPlano(r === "activo");
    if (r === "sin_permiso")
      setAvisoSegundoPlano("Para seguir con la app minimizada, permití la ubicación \"todo el tiempo\" en los ajustes del teléfono.");
    else if (r !== "activo") setAvisoSegundoPlano("No se pudo activar en este teléfono. La ubicación se comparte con la app abierta.");
  };

  return {
    ubicacion,
    segundoPlanoSoportado,
    enSegundoPlano,
    avisoSegundoPlano,
    cambiarSegundoPlano,
  };
}

export type GpsDelViaje = ReturnType<typeof useGpsDelViaje>;
