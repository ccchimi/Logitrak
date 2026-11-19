export interface ExportacionCuenta {
  formato: string;
  generadoEn: string;
  cuenta: { usuario: string; rol: string };
  chofer: { viajes: unknown[]; calificacionesRecibidas: unknown[] } | null;
  envios: unknown[];
  pagos: unknown[];
  cupones: unknown[];
  soporte: unknown[];
  [clave: string]: unknown;
}

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/** Lo que trae el archivo, en una línea, para confirmarle al usuario la descarga. */
export function resumenExportacion(d: ExportacionCuenta): string {
  const partes = [
    plural(d.envios.length, "envío", "envíos"),
    plural(d.pagos.length, "pago", "pagos"),
    plural(d.cupones.length, "cupón", "cupones"),
    plural(d.soporte.length, "consulta de soporte", "consultas de soporte"),
  ];
  if (d.chofer) {
    partes.push(plural(d.chofer.viajes.length, "viaje", "viajes"));
    partes.push(
      plural(d.chofer.calificacionesRecibidas.length, "calificación", "calificaciones"),
    );
  }
  return partes.join(" · ");
}

/** JSON con sangría: el archivo lo va a leer una persona, no solo un programa. */
export function contenidoDelArchivo(d: ExportacionCuenta): string {
  return `${JSON.stringify(d, null, 2)}\n`;
}
