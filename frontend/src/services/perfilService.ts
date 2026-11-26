import {
  guardarSesion,
  llamarApi,
  obtenerUsuarioSesion,
  UsuarioSesion,
} from "./api";
import type { ExportacionCuenta } from "../helpers/exportacion";

export type CampoPerfil =
  | "nombreCompleto"
  | "usuario"
  | "email"
  | "telefono"
  | "domicilio"
  | "vehiculoId"
  | "contrasena";

const CAMPOS_CON_CONTRASENA: CampoPerfil[] = ["contrasena", "nombreCompleto", "email", "telefono"];

export function limitacionEdicion(campo: CampoPerfil): string | null {
  if (CAMPOS_CON_CONTRASENA.includes(campo)) return null;
  if (campo === "usuario")
    return "El nombre de usuario no se puede cambiar: es con el que ingresás y el que figura en tus envíos.";
  return "Este dato de tu ficha de chofer lo cambia el equipo de Logitrak. Escribinos desde el Centro de ayuda.";
}

export async function verificarContrasenaPerfil(
  contrasena: string,
): Promise<{ exito: boolean; error?: string }> {
  const sesion = obtenerUsuarioSesion();
  if (!sesion || !contrasena)
    return { exito: false, error: "Ingresá tu contraseña actual." };
  const respuesta = await llamarApi<{ exito: true; usuario: UsuarioSesion }>(
    "/api/auth/login",
    {
      metodo: "POST",
      cuerpo: { usuario: sesion.usuario, contrasena },
      encabezados: { "X-Logitrak-Sesion": "verificar" },
    },
  );
  if (!respuesta.exito) return { exito: false, error: respuesta.error };
  if (
    respuesta.usuario?.id !== sesion.id ||
    respuesta.usuario?.usuario !== sesion.usuario
  ) {
    return {
      exito: false,
      error: "No se pudo verificar la identidad de tu cuenta.",
    };
  }
  return { exito: true };
}

export async function actualizarCampoPerfil(
  campo: CampoPerfil,
  valor: string,
  contrasena: string,
) {
  const limitacion = limitacionEdicion(campo);
  if (limitacion) return { exito: false, error: limitacion };
  if (!contrasena)
    return { exito: false, error: "Ingresá tu contraseña actual." };
  if (campo === "nombreCompleto" || campo === "email" || campo === "telefono")
    return actualizarDatosPerfil({ [campo]: valor }, contrasena);
  if (valor.length < 8)
    return { exito: false, error: "Usá al menos 8 caracteres." };
  return actualizarPerfil({
    contrasenaActual: contrasena,
    contrasenaNueva: valor,
  });
}

export interface ChoferEditable {
  codigo: string;
  email: string;
  telefono: string;
  domicilio: string;
  dni: string;
  vehiculoId: string | null;
}

export interface PerfilEditable {
  usuario: string;
  rol: "admin" | "cliente" | "chofer";
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  chofer: ChoferEditable | null;
}

export interface CambiosPerfil {
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  domicilio?: string;
  vehiculoId?: string;
  contrasenaActual?: string;
  contrasenaNueva?: string;
}

export async function obtenerPerfilEditable(): Promise<PerfilEditable | null> {
  const r = await llamarApi<{ exito: true; perfil: PerfilEditable }>(
    "/api/perfil/editable",
    {
      conAuth: true,
    },
  );
  return r.exito ? r.perfil : null;
}

export async function actualizarPerfil(
  cambios: CambiosPerfil,
): Promise<{ exito: boolean; error?: string }> {
  const r = await llamarApi<{
    exito: true;
    token: string;
    usuario: UsuarioSesion;
    refreshToken?: string;
  }>("/api/perfil", {
    metodo: "PUT",
    cuerpo: cambios,
    conAuth: true,
  });
  if (!r.exito)
    return { exito: false, error: (r as any).error ?? "No se pudo guardar." };
  // Al cambiar la contraseña, el servidor cierra todas las sesiones y le da
  // una nueva a este dispositivo.
  guardarSesion(r.token, r.usuario, r.refreshToken);
  return { exito: true };
}

export interface ResumenPerfil {
  usuario: string;
  nombreCompleto: string;
  rol: "admin" | "cliente" | "chofer";
  enviosTotales: number;
  enviosEntregados: number;
  cuponesActivos: number;
  clienteDesde: number;
}

export async function obtenerResumenPerfil(): Promise<ResumenPerfil | null> {
  const r = await llamarApi<{ exito: true; resumen: ResumenPerfil }>(
    "/api/perfil/resumen",
    {
      conAuth: true,
    },
  );
  return r.exito ? r.resumen : null;
}

export async function eliminarCuenta(contrasena: string): Promise<{ exito: true; mensaje: string } | { exito: false; error: string }> {
    const r = await llamarApi<{ exito: true; mensaje: string }>('/api/perfil/eliminar-cuenta', {
        metodo: 'POST',
        cuerpo: { contrasena },
        conAuth: true,
    });
    return r.exito ? { exito: true, mensaje: r.mensaje } : { exito: false, error: r.error };
}

export async function exportarDatosCuenta(
  contrasena: string,
): Promise<{ exito: true; archivo: string; datos: ExportacionCuenta } | { exito: false; error: string }> {
  const r = await llamarApi<{ exito: true; archivo: string; datos: ExportacionCuenta }>("/api/perfil/exportar", {
    metodo: "POST",
    cuerpo: { contrasena },
    conAuth: true,
  });
  return r.exito ? { exito: true, archivo: r.archivo, datos: r.datos } : { exito: false, error: r.error };
}

/**
 * Nombre, email y teléfono: el servidor vuelve a comprobar la contraseña en
 * cada cambio. Un texto vacío borra el email o el teléfono.
 */
export async function actualizarDatosPerfil(
  cambios: { nombreCompleto?: string; email?: string; telefono?: string },
  contrasenaActual: string,
): Promise<{ exito: boolean; error?: string }> {
  const r = await llamarApi<{ exito: true; token: string; usuario: UsuarioSesion }>("/api/perfil/datos", {
    metodo: "PUT",
    cuerpo: { contrasenaActual, ...cambios },
    conAuth: true,
  });
  if (!r.exito) return { exito: false, error: (r as any).error ?? "No se pudo guardar." };
  guardarSesion(r.token, r.usuario);
  return { exito: true };
}
