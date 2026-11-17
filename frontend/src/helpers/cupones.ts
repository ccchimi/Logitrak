export function aplicarDescuento(precio: number, descuentoPct: number): { monto: number; descuento: number } {
  const total = Math.round(Number(precio) * 100);
  const descuento = Math.round((total * Number(descuentoPct)) / 100);
  return { monto: (total - descuento) / 100, descuento: descuento / 100 };
}
