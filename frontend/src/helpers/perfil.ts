/** Campos que el titular cambia desde Mi Perfil con su contraseña (además de la contraseña). */
export type CampoDato = "nombreCompleto" | "email" | "telefono";

const ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normaliza lo que se va a mandar: sin espacios de más y el email en minúsculas. */
export function normalizarDato(campo: CampoDato, valor: string): string {
  const limpio = valor.trim();
  return campo === "email" ? limpio.toLowerCase() : limpio;
}

/**
 * Las mismas reglas que valida el servidor, para avisar antes de mandar.
 * Un email o teléfono vacío se permite (lo borra), salvo para un chofer.
 */
export function errorDelDato(campo: CampoDato, valor: string, { esChofer = false } = {}): string | null {
  const v = normalizarDato(campo, valor);
  if (campo === "nombreCompleto") {
    if (v.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (v.length > 120) return "El nombre no puede superar los 120 caracteres.";
    return null;
  }
  if (!v) return esChofer ? "Como chofer, necesitás un email y un teléfono para que te contacten." : null;
  if (campo === "email") {
    if (v.length > 120) return "El email no puede superar los 120 caracteres.";
    return ES_EMAIL.test(v) ? null : "Ingresá un email válido.";
  }
  if (v.length > 30) return "El teléfono no puede superar los 30 caracteres.";
  if (!/^[\d\s()+-]*$/.test(v)) return "El teléfono solo puede tener números, espacios, guiones, paréntesis y +.";
  if (v.replace(/\D/g, "").length < 8) return "Ingresá un teléfono con código de área (al menos 8 números).";
  return null;
}

export function mensajeGuardado(campo: CampoDato, valor: string): string {
  const v = normalizarDato(campo, valor);
  if (campo === "nombreCompleto") return "Tu nombre se actualizó correctamente.";
  if (campo === "email") return v ? "Tu email se actualizó correctamente." : "Borramos tu email.";
  return v ? "Tu teléfono se actualizó correctamente." : "Borramos tu teléfono.";
}

// --- Pantalla Mi Perfil ---

interface DatosDeContacto {
  email: string | null;
  telefono: string | null;
  chofer: { email: string; telefono: string } | null;
}

/** Email y teléfono a mostrar: los de la cuenta o, si no hay, los de la ficha de chofer. */
export function contactoDelPerfil(perfil: DatosDeContacto | null): { email: string; telefono: string } {
  return {
    email: perfil?.email ?? perfil?.chofer?.email ?? "",
    telefono: perfil?.telefono ?? perfil?.chofer?.telefono ?? "",
  };
}

/** Valor con el que arranca el editor de un campo (solo los que se escriben). */
export function valorParaEditar(campo: string, perfil: DatosDeContacto | null, nombre: string): string {
  if (campo === "nombreCompleto") return nombre;
  if (campo === "email") return contactoDelPerfil(perfil).email;
  if (campo === "telefono") return contactoDelPerfil(perfil).telefono;
  return "";
}

/** Estado de la verificación en dos pasos y si conviene avisar que quedan pocos códigos. */
export function textoDobleFactor(df: { activado: boolean; codigosRestantes: number }): { estado: string; pocosCodigos: boolean } {
  return {
    estado: df.activado
      ? `Activada · te quedan ${df.codigosRestantes} códigos de respaldo`
      : "Desactivada · recomendada para el equipo",
    pocosCodigos: df.activado && df.codigosRestantes <= 3,
  };
}

/** Resumen de la actividad de la cuenta. */
export function textoActividad(resumen: { enviosTotales: number; enviosEntregados: number; cuponesActivos: number } | null): string {
  if (!resumen) return "La actividad estará disponible al cargar tu perfil.";
  return `${resumen.enviosTotales} envíos · ${resumen.enviosEntregados} entregados · ${resumen.cuponesActivos} cupones activos`;
}
