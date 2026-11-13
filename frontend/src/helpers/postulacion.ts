export type DatosChofer = {
  nombreCompleto: string;
  email: string;
  telefono: string;
  domicilio: string;
  dni: string;
};
export type ErroresChofer = Partial<
  Record<keyof DatosChofer | "vehiculoId" | "identidad", string>
>;
export function validarDatosChofer(datos: DatosChofer): ErroresChofer {
  const errores: ErroresChofer = {};
  if (datos.nombreCompleto.trim().length < 5)
    errores.nombreCompleto =
      "Ingresá tu nombre completo como figura en el DNI.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim()))
    errores.email = "Ingresá un email válido, por ejemplo nombre@mail.com.";
  if (datos.telefono.replace(/\D/g, "").length < 8)
    errores.telefono = "Ingresá un teléfono con al menos 8 dígitos.";
  if (datos.domicilio.trim().length < 6)
    errores.domicilio = "Ingresá calle, número y localidad.";
  if (!/^\d{7,8}$/.test(datos.dni.replace(/\D/g, "")))
    errores.dni = "Ingresá los 7 u 8 dígitos de tu DNI.";
  return errores;
}
