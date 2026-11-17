export function aplicarDescuento(precio: number, descuentoPct: number): { monto: number; descuento: number } {
  const total = Math.round(Number(precio) * 100);
  const descuento = Math.round((total * Number(descuentoPct)) / 100);
  return { monto: (total - descuento) / 100, descuento: descuento / 100 };
}

type CuponConFechas = {
  estado: "activo" | "usado" | "vencido";
  venceEn?: string | null;
  usadoEn?: string | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

const fechaCorta = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function estadoDeCupon(cupon: CuponConFechas, ahora = new Date()): CuponConFechas["estado"] {
  if (cupon.estado !== "activo" || !cupon.venceEn) return cupon.estado;
  return new Date(cupon.venceEn).getTime() <= ahora.getTime() ? "vencido" : "activo";
}

export function cuponesDisponibles<T extends CuponConFechas>(cupones: T[], ahora = new Date()): T[] {
  return cupones.filter((c) => estadoDeCupon(c, ahora) === "activo");
}

export function textoVencimiento(cupon: CuponConFechas, ahora = new Date()): string | null {
  const estado = estadoDeCupon(cupon, ahora);
  if (estado === "usado") return cupon.usadoEn ? `Usado el ${fechaCorta(new Date(cupon.usadoEn))}` : "Usado";
  if (!cupon.venceEn) return null;
  const vence = new Date(cupon.venceEn);
  if (estado === "vencido") return `Venció el ${fechaCorta(vence)}`;
  const dias = Math.round((inicioDelDia(vence) - inicioDelDia(ahora)) / DIA_MS);
  if (dias <= 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias <= 7) return `Vence en ${dias} días`;
  return `Vence el ${fechaCorta(vence)}`;
}

export function venceProntoCupon(cupon: CuponConFechas, ahora = new Date()): boolean {
  if (estadoDeCupon(cupon, ahora) !== "activo" || !cupon.venceEn) return false;
  return new Date(cupon.venceEn).getTime() - ahora.getTime() <= 7 * DIA_MS;
}
