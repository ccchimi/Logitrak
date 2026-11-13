import { useEffect, useSyncExternalStore } from "react";
import {
  cargarPreferencias,
  obtenerPreferencias,
  suscribirPreferencias,
} from "../services/preferenciasService";

export function usePreferencias() {
  const preferencias = useSyncExternalStore(
    suscribirPreferencias,
    obtenerPreferencias,
    obtenerPreferencias,
  );
  useEffect(() => {
    void cargarPreferencias();
  }, []);
  return preferencias;
}
