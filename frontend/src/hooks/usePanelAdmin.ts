import { useCallback, useEffect, useRef, useState } from "react";
import { FILTROS_INICIALES, type PedidoAdmin } from "../helpers/panelAdmin";
import { consultarPedidos, obtenerPanel, type PanelServidor } from "../services/panelAdminService";

/** Indicadores del panel y los pedidos más recientes, calculados en el servidor. */
export function usePanelAdmin(navigation: any, dias: number) {
  const [panel, setPanel] = useState<PanelServidor | null>(null);
  const [recientes, setRecientes] = useState<PedidoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const montado = useRef(false),
    solicitud = useRef(0);
  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setCargando(true);
    setError("");
    try {
      const [p, r] = await Promise.all([
        obtenerPanel(dias),
        consultarPedidos(FILTROS_INICIALES, { limite: 10 }),
      ]);
      if (montado.current && id === solicitud.current) {
        setPanel(p);
        setRecientes(r.pedidos.slice(0, 5));
      }
    } catch (e) {
      if (montado.current && id === solicitud.current) {
        setPanel(null);
        setError(e instanceof Error ? e.message : "No pudimos cargar el panel.");
      }
    } finally {
      if (montado.current && id === solicitud.current) setCargando(false);
    }
  }, [dias]);
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
  return { panel, recientes, cargando, error, cargar };
}
