import { llamarApi } from "./api";

export interface EstadoDobleFactor {
  disponible: boolean;
  activado: boolean;
  activadoEn: string | null;
  codigosRestantes: number;
}

type Resultado<T> = ({ exito: true } & T) | { exito: false; error: string; codigo?: string };

async function pedir<T>(ruta: string, metodo: "GET" | "POST", cuerpo?: unknown): Promise<Resultado<T>> {
  const r = (await llamarApi<{ exito: true } & T>(ruta, { metodo, cuerpo, conAuth: true })) as any;
  if (r.exito) return r;
  return { exito: false, error: r.error || "No se pudo completar la operación.", codigo: r.codigo };
}

export const obtenerDobleFactor = () =>
  pedir<{ dobleFactor: EstadoDobleFactor }>("/api/perfil/doble-factor", "GET");

/** Paso 1: con la contraseña, genera el QR para la app autenticadora. */
export const iniciarDobleFactor = (contrasena: string) =>
  pedir<{ secreto: string; uri: string; qr: string }>("/api/perfil/doble-factor/iniciar", "POST", { contrasena });

/** Paso 2: con el primer código de la app, la activa y devuelve los códigos de respaldo. */
export const activarDobleFactor = (codigo: string) =>
  pedir<{ codigosRespaldo: string[]; dobleFactor: EstadoDobleFactor }>("/api/perfil/doble-factor/activar", "POST", { codigo });

export const desactivarDobleFactor = (contrasena: string, codigo: string) =>
  pedir<{ dobleFactor: EstadoDobleFactor }>("/api/perfil/doble-factor/desactivar", "POST", { contrasena, codigo });

export const regenerarCodigosRespaldo = (contrasena: string, codigo: string) =>
  pedir<{ codigosRespaldo: string[]; dobleFactor: EstadoDobleFactor }>("/api/perfil/doble-factor/codigos", "POST", { contrasena, codigo });

/** Solo admin: para alguien del equipo que perdió el teléfono y los códigos. */
export const restablecerDobleFactor = (usuarioId: number) =>
  pedir<{ mensaje: string }>(`/api/admin/usuarios/${usuarioId}/doble-factor/restablecer`, "POST");
