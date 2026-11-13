import {
  alertasPedidos,
  entregasVerificables,
  errorFechas,
  FILTROS_INICIALES,
  filtrarPedidos,
  inicioPeriodo,
  instante,
  PedidoAdmin,
  seriePedidos,
  ultimas24,
  ventanaCubierta,
} from "../panelAdmin";
const ahora = Date.parse("2026-11-12T16:00:00Z");
const dia = 86400000;
function pedido(id: number, cambios: Partial<PedidoAdmin> = {}): PedidoAdmin {
  return {
    id,
    codigo: `LT-${id}`,
    clienteId: 1,
    choferId: null,
    choferNombre: null,
    choferCodigo: null,
    origen: "Origen de prueba",
    destino: "Destino de prueba",
    estado: "pendiente",
    estadoPago: "pagado",
    precio: 100,
    moneda: "ARS",
    creadoEn: new Date(ahora - 3600000).toISOString(),
    actualizadoEn: new Date(ahora).toISOString(),
    entregadoEn: null,
    slaVenceEn: null,
    ofertaVenceEn: null,
    ...cambios,
  };
}
test("24 horas móviles cuentan todos los estados y pagos, con offsets equivalentes y sin fechas futuras", () => {
  const pedidos = [
    pedido(1),
    pedido(2, {
      estado: "cancelado",
      estadoPago: "rechazado",
      creadoEn: "2026-11-12T12:00:00-03:00",
    }),
    pedido(3, { creadoEn: new Date(ahora - dia).toISOString() }),
    pedido(4, { creadoEn: new Date(ahora - 2 * dia).toISOString() }),
    pedido(5, { creadoEn: new Date(ahora + 1).toISOString() }),
  ];
  expect(ultimas24(pedidos, true, ahora)).toMatchObject({
    actual: 2,
    anterior: 1,
    cambio: 1,
    porcentaje: 100,
  });
});
test("sin base porcentual no muestra infinito; vacíos completos son cero, parciales no", () => {
  expect(ultimas24([pedido(1)], true, ahora)).toMatchObject({
    actual: 1,
    anterior: 0,
    cambio: 1,
    porcentaje: null,
  });
  expect(ultimas24([], true, ahora)).toMatchObject({
    actual: 0,
    anterior: 0,
    cambio: 0,
  });
  expect(ultimas24([], false, ahora)).toMatchObject({
    actual: null,
    anterior: null,
  });
});
test("una fila antigua de otro estado no prueba cobertura de un listado truncado", () => {
  const pedidos = [
    pedido(1),
    pedido(2, { creadoEn: new Date(ahora - 40 * dia).toISOString() }),
  ];
  expect(ventanaCubierta(pedidos, false, ahora - dia)).toBe(false);
  expect(ultimas24(pedidos, false, ahora, ahora - 30 * 3600000)).toMatchObject({
    actual: 1,
    anterior: null,
    cambio: null,
  });
});
test("rechaza fechas ambiguas o inválidas del servidor en estadísticas temporales", () => {
  expect(Number.isNaN(instante("2026-11-12T12:00:00"))).toBe(true);
  expect(
    ultimas24([pedido(1, { creadoEn: "inválida" })], true, ahora).actual,
  ).toBeNull();
});
test("combina número, estado activo, cliente, chofer y fechas antes de ordenar", () => {
  const pedidos = [
    pedido(1, { estado: "en_viaje", choferId: 2 }),
    pedido(2, { estado: "asignado", choferId: 2, precio: 300 }),
    pedido(3, { clienteId: 7 }),
  ];
  const f = {
    ...FILTROS_INICIALES,
    estado: "activos" as const,
    cliente: "1",
    chofer: "2",
    busqueda: "lt-",
    desde: "2026-11-01",
    hasta: "2026-11-30",
    orden: "importe_mayor" as const,
  };
  expect(filtrarPedidos(pedidos, f).map((p) => p.id)).toEqual([2, 1]);
  expect(
    filtrarPedidos(pedidos, { ...f, busqueda: "1" }).map((p) => p.id),
  ).toEqual([1]);
  expect(
    filtrarPedidos(pedidos, {
      ...FILTROS_INICIALES,
      chofer: "sin_asignar",
    }).map((p) => p.id),
  ).toEqual([3]);
});
test("valida fecha real, año bisiesto y rangos invertidos", () => {
  expect(errorFechas({ desde: "2026-02-30", hasta: "" })).toBeTruthy();
  expect(errorFechas({ desde: "2024-02-29", hasta: "2024-02-29" })).toBe("");
  expect(
    errorFechas({ desde: "2026-11-12", hasta: "2026-11-11" }),
  ).toBeTruthy();
});
test("hasta incluye el día local completo y excluye el día siguiente", () => {
  const a = new Date(2026, 10, 12, 23, 59, 59).toISOString(),
    b = new Date(2026, 10, 13).toISOString();
  expect(
    filtrarPedidos([pedido(1, { creadoEn: a }), pedido(2, { creadoEn: b })], {
      ...FILTROS_INICIALES,
      desde: "2026-11-12",
      hasta: "2026-11-12",
    }).map((p) => p.id),
  ).toEqual([1]);
});
test("serie de 30 días cuenta entregas en su fecha y no por la fecha de creación", () => {
  const p = pedido(1, {
    creadoEn: new Date(ahora - 40 * dia).toISOString(),
    entregadoEn: new Date(ahora).toISOString(),
    estado: "entregado",
  });
  const serie = seriePedidos([p], 30, ahora);
  expect(serie).toHaveLength(30);
  expect(serie.reduce((s, d) => s + d.creados, 0)).toBe(0);
  expect(serie.reduce((s, d) => s + d.entregados, 0)).toBe(1);
  expect(inicioPeriodo(7, ahora)).toBeLessThan(ahora - 5 * dia);
});
test("alertas usan solo pagos, asignaciones y vencimientos existentes", () => {
  const alertas = alertasPedidos(
    [
      pedido(1),
      pedido(2, { estadoPago: "pendiente" }),
      pedido(3, {
        estado: "en_viaje",
        slaVenceEn: new Date(ahora - 1).toISOString(),
      }),
      pedido(4, {
        estado: "entregado",
        slaVenceEn: new Date(ahora - 1).toISOString(),
      }),
    ],
    ahora,
  );
  expect(alertas.sinAsignar.map((p) => p.id)).toEqual([1]);
  expect(alertas.sla.map((p) => p.id)).toEqual([3]);
  expect(alertas.ofertas).toHaveLength(0);
});

test("una entrega sin fecha no habilita métricas por período", () => {
  expect(
    entregasVerificables([
      pedido(1, { estado: "entregado", entregadoEn: null }),
    ]),
  ).toBe(false);
  expect(
    entregasVerificables([
      pedido(1, {
        estado: "entregado",
        entregadoEn: new Date(ahora).toISOString(),
      }),
    ]),
  ).toBe(true);
});
