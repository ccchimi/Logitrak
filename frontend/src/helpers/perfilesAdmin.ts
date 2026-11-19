export interface FichaChoferAdmin {
  codigo: string;
  email: string;
  telefono: string;
  domicilio: string;
  dni: string;
  vehiculoId: string | null;
}

export interface PerfilAdmin {
  id: number;
  usuario: string;
  rol: "cliente" | "chofer" | "soporte" | "admin";
  nombreCompleto: string;
  creadoEn: string;
  chofer: FichaChoferAdmin | null;
  /** Si la cuenta tiene la verificación en dos pasos activada (solo equipo). */
  dobleFactor?: boolean;
}

export interface FormularioPerfilAdmin {
  nombreCompleto: string;
  email: string;
  telefono: string;
  domicilio: string;
  vehiculoId: string;
}

export type CambiosPerfilAdmin = Partial<FormularioPerfilAdmin>;

const ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formularioDesde(perfil: PerfilAdmin): FormularioPerfilAdmin {
  return {
    nombreCompleto: perfil.nombreCompleto ?? "",
    email: perfil.chofer?.email ?? "",
    telefono: perfil.chofer?.telefono ?? "",
    domicilio: perfil.chofer?.domicilio ?? "",
    vehiculoId: perfil.chofer?.vehiculoId ?? "",
  };
}

export function cambiosDelFormulario(perfil: PerfilAdmin, form: FormularioPerfilAdmin): CambiosPerfilAdmin {
  const original = formularioDesde(perfil);
  const campos: (keyof FormularioPerfilAdmin)[] = perfil.chofer
    ? ["nombreCompleto", "email", "telefono", "domicilio", "vehiculoId"]
    : ["nombreCompleto"];
  const cambios: CambiosPerfilAdmin = {};
  for (const campo of campos) {
    let valor = form[campo].trim();
    if (campo === "email") valor = valor.toLowerCase();
    if (valor !== original[campo].trim()) cambios[campo] = valor;
  }
  return cambios;
}

export function errorDelFormulario(cambios: CambiosPerfilAdmin): string | null {
  if (cambios.nombreCompleto !== undefined && (cambios.nombreCompleto.length < 3 || cambios.nombreCompleto.length > 120)) {
    return "El nombre debe tener entre 3 y 120 caracteres.";
  }
  if (cambios.email !== undefined && (cambios.email.length > 120 || !ES_EMAIL.test(cambios.email))) {
    return "Ingresá un email válido.";
  }
  if (
    cambios.telefono !== undefined &&
    (cambios.telefono.length > 30 || cambios.telefono.replace(/\D/g, "").length < 8)
  ) {
    return "Ingresá un teléfono válido.";
  }
  if (cambios.domicilio !== undefined && (cambios.domicilio.length < 6 || cambios.domicilio.length > 200)) {
    return "Ingresá el domicilio completo (entre 6 y 200 caracteres).";
  }
  if (cambios.vehiculoId !== undefined && !cambios.vehiculoId) return "Elegí un vehículo de la flota.";
  return null;
}
