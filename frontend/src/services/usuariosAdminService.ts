import { llamarApi, obtenerUsuarioSesion, RolUsuario } from "./api";
import type { CambiosPerfilAdmin, PerfilAdmin } from "../helpers/perfilesAdmin";

export interface UsuarioAdmin {
  id: number;
  usuario: string;
  nombreCompleto: string;
  rol: RolUsuario;
  creadoEn: string;
  codigoChofer: string | null;
  email: string | null;
  telefono: string | null;
}
export interface FiltrosUsuariosAdmin {
  busqueda: string;
  rol: RolUsuario | "todos";
  desde: string;
  hasta: string;
  orden: "recientes" | "antiguos" | "nombre_az" | "nombre_za";
}
export const FILTROS_USUARIOS: FiltrosUsuariosAdmin = {
  busqueda: "",
  rol: "todos",
  desde: "",
  hasta: "",
  orden: "recientes",
};
export interface ListaUsuariosAdmin {
  usuarios: UsuarioAdmin[];
  total: number;
  pagina: number;
  paginas: number;
  cantidad: number;
  resumen: {
    total: number;
    clientes: number;
    choferes: number;
    soporte?: number;
    administradores: number;
  };
}

export async function obtenerUsuariosAdmin(
  filtros: FiltrosUsuariosAdmin,
  pagina: number,
  cantidad: number,
): Promise<ListaUsuariosAdmin> {
  const rol = obtenerUsuarioSesion()?.rol;
  if (rol !== "admin" && rol !== "soporte") {
    throw new Error(
      "Necesitás una cuenta del equipo (soporte o administrador) para consultar los usuarios.",
    );
  }
  const parametros = new URLSearchParams({
    ...filtros,
    busqueda: filtros.busqueda.trim(),
    pagina: String(pagina),
    cantidad: String(cantidad),
  });
  const r = await llamarApi<{ exito: true } & ListaUsuariosAdmin>(
    `/api/admin/usuarios?${parametros.toString()}`,
    { conAuth: true },
  );
  if (!r.exito && /^ruta no encontrada\.?$/i.test(r.error?.trim() ?? "")) {
    throw new Error(
      "La lista de usuarios todavía no está habilitada en este servidor. El equipo de Logitrak debe actualizar el servicio para que puedas consultarla.",
    );
  }
  if (!r.exito)
    throw new Error(r.error || "No pudimos consultar los usuarios.");
  if (
    !Array.isArray(r.usuarios) ||
    !r.resumen ||
    !Number.isInteger(r.total) ||
    !Number.isInteger(r.paginas)
  ) {
    throw new Error(
      "La respuesta de usuarios no es válida. Verificá que el backend esté actualizado.",
    );
  }
  return r;
}

export async function cambiarRolUsuario(
  id: number,
  rol: "cliente" | "soporte" | "admin"
): Promise<{ exito: true } | { exito: false; error: string }> {
  const r = await llamarApi<{ exito: true }>(`/api/admin/usuarios/${id}/rol`, {
    metodo: "PUT",
    cuerpo: { rol },
    conAuth: true,
  });
  return r.exito ? { exito: true } : { exito: false, error: (r as any).error ?? "No se pudo cambiar el rol." };
}

/**
 * Contraseña temporal para un cliente o chofer que pidió recuperar su cuenta.
 * La devuelve una sola vez: vence a las 24 horas y obliga a elegir una nueva.
 */
export async function generarContrasenaTemporal(
  id: number
): Promise<{ exito: true; contrasenaTemporal: string; venceEn: string; mensaje: string } | { exito: false; error: string }> {
  const r = await llamarApi<{ exito: true; contrasenaTemporal: string; venceEn: string; mensaje: string }>(
    `/api/admin/usuarios/${id}/contrasena-temporal`,
    { metodo: "POST", conAuth: true }
  );
  return r.exito
    ? { exito: true, contrasenaTemporal: r.contrasenaTemporal, venceEn: r.venceEn, mensaje: r.mensaje }
    : { exito: false, error: (r as any).error ?? "No se pudo generar la contraseña temporal." };
}

export async function obtenerPerfilUsuario(
  id: number,
): Promise<{ exito: true; perfil: PerfilAdmin } | { exito: false; error: string }> {
  const r = await llamarApi<{ exito: true; perfil: PerfilAdmin }>(`/api/admin/usuarios/${id}`, { conAuth: true });
  return r.exito ? { exito: true, perfil: r.perfil } : { exito: false, error: (r as any).error ?? "No pudimos cargar los datos." };
}

export async function editarPerfilUsuario(
  id: number,
  cambios: CambiosPerfilAdmin,
): Promise<{ exito: true; perfil: PerfilAdmin; sinCambios?: boolean } | { exito: false; error: string }> {
  const r = await llamarApi<{ exito: true; perfil: PerfilAdmin; sinCambios?: boolean }>(`/api/admin/usuarios/${id}`, {
    metodo: "PUT",
    cuerpo: cambios,
    conAuth: true,
  });
  return r.exito
    ? { exito: true, perfil: r.perfil, sinCambios: r.sinCambios }
    : { exito: false, error: (r as any).error ?? "No se pudieron guardar los cambios." };
}
