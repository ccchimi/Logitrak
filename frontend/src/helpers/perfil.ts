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
