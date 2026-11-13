import { guardarJson, leerJson } from "./almacenamiento";

export type Preferencias = { tema: "oscuro" | "claro"; silencioso: boolean };
const CLAVE = "logitrak.preferencias";
const INICIALES: Preferencias = { tema: "oscuro", silencioso: false };
let preferencias = INICIALES;
let cambiosLocales: Partial<Preferencias> = {};
let carga: Promise<void> | null = null;
let escritura = Promise.resolve();
const oyentes = new Set<() => void>();

export const obtenerPreferencias = () => preferencias;
export function suscribirPreferencias(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
function notificar() {
  oyentes.forEach((oyente) => oyente());
}

export function cargarPreferencias(): Promise<void> {
  if (carga) return carga;
  carga = leerJson<Partial<Preferencias>>(CLAVE).then((guardadas) => {
    if (!guardadas) return;
    preferencias = {
      tema: guardadas.tema === "claro" ? "claro" : "oscuro",
      silencioso: guardadas.silencioso === true,
      ...cambiosLocales,
    };
    notificar();
  });
  return carga;
}

export function actualizarPreferencias(cambios: Partial<Preferencias>) {
  cambiosLocales = { ...cambiosLocales, ...cambios };
  preferencias = { ...preferencias, ...cambios };
  notificar();
  escritura = escritura.then(async () => {
    await cargarPreferencias();
    await guardarJson(CLAVE, preferencias);
  });
  return escritura;
}

export async function reproducirSonido(
  reproducir: () => void | Promise<void>,
): Promise<boolean> {
  await cargarPreferencias();
  if (preferencias.silencioso) return false;
  await reproducir();
  return true;
}
