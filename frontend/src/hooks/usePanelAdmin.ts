import { useCallback, useEffect, useRef, useState } from "react";
import {
  DatosPanelAdmin,
  obtenerPanelAdmin,
} from "../services/panelAdminService";

export function usePanelAdmin(navigation: any) {
  const [datos, setDatos] = useState<DatosPanelAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const montado = useRef(false),
    solicitud = useRef(0);
  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setCargando(true);
    setError("");
    try {
      const respuesta = await obtenerPanelAdmin();
      if (montado.current && id === solicitud.current) setDatos(respuesta);
    } catch (e) {
      if (montado.current && id === solicitud.current) {
        setDatos(null);
        setError(
          e instanceof Error ? e.message : "No pudimos cargar los pedidos.",
        );
      }
    } finally {
      if (montado.current && id === solicitud.current) setCargando(false);
    }
  }, []);
  useEffect(() => {
    montado.current = true;
    void cargar();
    const quitar = navigation.addListener("focus", cargar);
    return () => {
      montado.current = false;
      solicitud.current++;
      quitar();
    };
  }, [cargar, navigation]);
  return { datos, cargando, error, cargar };
}
