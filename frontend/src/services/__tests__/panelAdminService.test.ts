import { obtenerPanelAdmin } from "../panelAdminService";
import { llamarApi, obtenerUsuarioSesion } from "../api";
import type { Envio } from "../enviosService";
jest.mock("../api", () => ({
  llamarApi: jest.fn(),
  obtenerUsuarioSesion: jest.fn(),
}));
const api = jest.mocked(llamarApi),
  usuario = jest.mocked(obtenerUsuarioSesion);
const metricas = (total: number) => ({
  total,
  enViaje: 0,
  pendientes: total,
  entregados: 0,
  cancelados: 0,
  cumplimiento: 0,
});
const pedido = (id: number, estado = "pendiente") =>
  ({
    id,
    codigo: `QA-${id}`,
    creadoEn: "2026-11-12T10:00:00Z",
    estado,
    choferTelefono: "no-conservar",
  }) as Envio;
beforeEach(() => {
  jest.resetAllMocks();
  usuario.mockReturnValue({
    id: 1,
    usuario: "qa",
    nombreCompleto: "QA",
    rol: "admin",
    chofer: null,
  });
});
// Simula el listado paginado del servidor: páginas de `limite` con cursor.
function responder(envios: Envio[], total: number) {
  api.mockImplementation(async (ruta: string) => {
    if (ruta === "/api/auth/perfil")
      return { exito: true, usuario: { rol: "admin" } } as any;
    if (ruta === "/api/envios/metricas")
      return { exito: true, metricas: metricas(total) } as any;
    const q = new URLSearchParams(ruta.split("?")[1] ?? "");
    const limite = Number(q.get("limite") ?? 200);
    const desde = Number(q.get("cursor") ?? 0);
    const pagina = envios.slice(desde, desde + limite);
    const siguiente = desde + limite < envios.length ? String(desde + limite) : null;
    return { exito: true, envios: pagina, siguiente } as any;
  });
}
test.each(["cliente", "chofer", null])(
  "bloquea rol %s antes de consultar",
  async (rol) => {
    usuario.mockReturnValue(
      rol
        ? ({
            id: 1,
            usuario: "qa",
            nombreCompleto: "QA",
            rol,
            chofer: null,
          } as any)
        : null,
    );
    await expect(obtenerPanelAdmin()).rejects.toThrow("equipo");
    expect(api).not.toHaveBeenCalled();
  },
);
test("tampoco acepta rol admin guardado si el servidor devuelve cliente", async () => {
  api.mockResolvedValue({ exito: true, usuario: { rol: "cliente" } } as any);
  await expect(obtenerPanelAdmin()).rejects.toThrow("servidor");
  expect(api).toHaveBeenCalledTimes(1);
});
test("lista completa real y minimiza campos conservados", async () => {
  responder([pedido(1)], 1);
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(true);
  expect(r.pedidos).toHaveLength(1);
  expect(r.pedidos[0]).not.toHaveProperty("choferTelefono");
  expect(api).toHaveBeenCalledWith("/api/envios?limite=100", { conAuth: true });
});
test("propaga errores en lugar de convertirlos en un listado vacío", async () => {
  api.mockImplementation(async (ruta) =>
    ruta === "/api/auth/perfil"
      ? ({ exito: true, usuario: { rol: "admin" } } as any)
      : { exito: false, error: "Servidor sin conexión" },
  );
  await expect(obtenerPanelAdmin()).rejects.toThrow("Servidor sin conexión");
});
test("recorre todas las páginas y queda completa si coincide con el total", async () => {
  const envios = Array.from({ length: 250 }, (_, i) => pedido(i));
  responder(envios, 250);
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(true);
  expect(r.pedidos).toHaveLength(250);
  expect(api).toHaveBeenCalledWith("/api/envios?limite=100&cursor=100", { conAuth: true });
  expect(api).toHaveBeenCalledWith("/api/envios?limite=100&cursor=200", { conAuth: true });
});

test("si el total no coincide no presenta los resultados como completos", async () => {
  responder([pedido(1), pedido(2)], 5);
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(false);
  expect(r.creacionesDesde).toBe(Date.parse("2026-11-12T10:00:00Z"));
});

test("corta en 5000 pedidos y avisa que muestra los más recientes", async () => {
  const envios = Array.from({ length: 5100 }, (_, i) => pedido(i));
  responder(envios, 5100);
  const r = await obtenerPanelAdmin();
  expect(r.pedidos).toHaveLength(5000);
  expect(r.completa).toBe(false);
  expect(r.aviso).toMatch(/5000 pedidos más recientes/);
});

test("soporte también entra al panel de operación (Hito 3.2)", async () => {
  usuario.mockReturnValue({ id: 2, usuario: "sop", nombreCompleto: "Soporte", rol: "soporte", chofer: null });
  api.mockImplementation(async (ruta: string) => {
    if (ruta === "/api/auth/perfil") return { exito: true, usuario: { rol: "soporte" } } as any;
    if (ruta === "/api/envios/metricas") return { exito: true, metricas: metricas(1) } as any;
    return { exito: true, envios: [pedido(1)] } as any;
  });
  expect((await obtenerPanelAdmin()).pedidos).toHaveLength(1);
});
