import {
  guardarSesion,
  llamarApi,
  obtenerUsuarioSesion,
  UsuarioSesion,
} from "./api";

export type CampoPerfil =
  | "nombreCompleto"
  | "usuario"
  | "email"
  | "telefono"
  | "domicilio"
  | "vehiculoId"
  | "contrasena";

export function limitacionEdicion(campo: CampoPerfil): string | null {
  if (campo === "contrasena") return null;
  if (campo === "usuario")
    return "El servidor todavía no permite modificar el nombre de usuario.";
  return "La edición de este dato requiere que el servidor valide una autorización de contraseña para ese cambio. Esta verificación todavía no está disponible.";
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
  }>("/api/perfil", {
    metodo: "PUT",
    cuerpo: cambios,
    conAuth: true,
  });
  if (!r.exito)
    return { exito: false, error: (r as any).error ?? "No se pudo guardar." };
  guardarSesion(r.token, r.usuario);
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

// Derecho de supresión: elimina la cuenta propia confirmando con la contraseña.
// El backend anonimiza los datos y conserva solo los comprobantes de pago.
export async function eliminarCuenta(contrasena: string): Promise<{ exito: true; mensaje: string } | { exito: false; error: string }> {
    const r = await llamarApi<{ exito: true; mensaje: string }>('/api/perfil/eliminar-cuenta', {
        metodo: 'POST',
        cuerpo: { contrasena },
        conAuth: true,
    });
    return r.exito ? { exito: true, mensaje: r.mensaje } : { exito: false, error: r.error };
}
