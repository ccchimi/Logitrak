import { aplicarDescuento } from "../cupones";

describe("Descuento de un cupón al pagar", () => {
  test("calcula el monto y el descuento igual que el servidor", () => {
    expect(aplicarDescuento(3350, 10)).toEqual({ monto: 3015, descuento: 335 });
    expect(aplicarDescuento(9000, 15)).toEqual({ monto: 7650, descuento: 1350 });
  });

  test("redondea a centavos sin errores de punto flotante", () => {
    expect(aplicarDescuento(1234.56, 10)).toEqual({ monto: 1111.1, descuento: 123.46 });
    expect(aplicarDescuento(0.1, 10)).toEqual({ monto: 0.09, descuento: 0.01 });
  });

  test("0 % no cambia el precio y 100 % lo deja en cero", () => {
    expect(aplicarDescuento(5000, 0)).toEqual({ monto: 5000, descuento: 0 });
    expect(aplicarDescuento(5000, 100)).toEqual({ monto: 0, descuento: 5000 });
  });
});
