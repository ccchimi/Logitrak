import { llamarApi, obtenerUsuarioSesion, RolUsuario } from "./api";

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
    administradores: number;
  };
}

export async function obtenerUsuariosAdmin(
  filtros: FiltrosUsuariosAdmin,
  pagina: number,
  cantidad: number,
): Promise<ListaUsuariosAdmin> {
  if (obtenerUsuarioSesion()?.rol !== "admin") {
    throw new Error(
      "Necesitás una cuenta de administrador para consultar los usuarios.",
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
