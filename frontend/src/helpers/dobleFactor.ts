/**
 * Limpia lo que escribe la persona: un código de la app (6 dígitos, aunque lo
 * pegue con espacios) o uno de respaldo (8 letras y números, con o sin guion).
 */
export function normalizarCodigo(texto: string): string {
  const limpio = texto.trim().replace(/\s/g, "");
  if (/^\d+$/.test(limpio)) return limpio.slice(0, 6);
  return limpio.toLowerCase().slice(0, 9);
}

export function codigoCompleto(texto: string): boolean {
  const c = normalizarCodigo(texto);
  return /^\d{6}$/.test(c) || /^[a-z0-9]{4}-?[a-z0-9]{4}$/.test(c);
}

/** El secreto en grupos de 4, para copiarlo a mano en la app si no se puede escanear el QR. */
export function secretoLegible(secreto: string): string {
  return secreto.replace(/(.{4})/g, "$1 ").trim();
}

/** Archivo de texto con los códigos de respaldo, para guardarlo o imprimirlo. */
export function textoCodigosRespaldo(usuario: string, codigos: string[], fecha = new Date()): string {
  return [
    "Logitrak · códigos de respaldo de la verificación en dos pasos",
    `Cuenta: ${usuario}`,
    `Generados: ${fecha.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`,
    "",
    "Cada código sirve una sola vez, si no tenés el teléfono a mano.",
    "Guardalos en un lugar seguro: con tu contraseña, dan acceso a la cuenta.",
    "",
    ...codigos.map((c, i) => `${String(i + 1).padStart(2, " ")}. ${c}`),
    "",
  ].join("\n");
}
