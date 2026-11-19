import { consultarPedidos, obtenerPanel, parametrosDeConsulta } from "../panelAdminService";
import { llamarApi, obtenerUsuarioSesion } from "../api";
import { FILTROS_INICIALES } from "../../helpers/panelAdmin";
import type { Envio } from "../enviosService";

jest.mock("../api", () => ({
  llamarApi: jest.fn(),
  obtenerUsuarioSesion: jest.fn(),
}));
const api = jest.mocked(llamarApi),
  usuario = jest.mocked(obtenerUsuarioSesion);
const sesion = (rol: string) => ({ id: 1, usuario: "qa", nombreCompleto: "QA", rol, chofer: null }) as any;

beforeEach(() => {
  jest.resetAllMocks();
  usuario.mockReturnValue(sesion("admin"));
});

test.each(["cliente", "chofer"])("bloquea el rol %s antes de consultar", async (rol) => {
  usuario.mockReturnValue(sesion(rol));
  await expect(obtenerPanel(7)).rejects.toThrow("equipo");
  await expect(consultarPedidos(FILTROS_INICIALES)).rejects.toThrow("equipo");
  expect(api).not.toHaveBeenCalled();
});

test("pide el panel calculado en el servidor y propaga los errores", async () => {
  api.mockResolvedValue({ exito: true, panel: { dias: 30 } } as any);
  usuario.mockReturnValue(sesion("soporte"));
  expect((await obtenerPanel(30)).dias).toBe(30);
  expect(api).toHaveBeenCalledWith("/api/envios/panel?dias=30", { conAuth: true });
  api.mockResolvedValue({ exito: false, error: "Servidor sin conexión" } as any);
  await expect(obtenerPanel(7)).rejects.toThrow("Servidor sin conexión");
});

test("arma la consulta con todos los filtros y deja afuera los vacíos", () => {
  expect(parametrosDeConsulta(FILTROS_INICIALES)).toBe("pagina=1&limite=10&orden=recientes&estado=todos");
  const q = new URLSearchParams(
    parametrosDeConsulta(
      { ...FILTROS_INICIALES, busqueda: " TRK-1 ", cliente: "7", chofer: "sin_asignar", desde: "2026-11-01", hasta: "2026-11-12", orden: "importe_mayor", estado: "activos" },
      { atencion: "revision", pagina: 3, limite: 25 },
    ),
  );
  expect(Object.fromEntries(q)).toEqual({
    pagina: "3", limite: "25", orden: "importe_mayor", estado: "activos", q: "TRK-1",
    cliente: "7", chofer: "sin_asignar", desde: "2026-11-01", hasta: "2026-11-12", atencion: "revision",
  });
});

test("devuelve la página con el total y solo los campos que usa el panel", async () => {
  api.mockResolvedValue({
    exito: true,
    envios: [{ id: 1, codigo: "QA-1", estado: "pendiente", choferTelefono: "no-conservar" } as unknown as Envio],
    total: 31, pagina: 2, paginas: 4,
  } as any);
  const r = await consultarPedidos(FILTROS_INICIALES, { pagina: 2 });
  expect([r.total, r.pagina, r.paginas]).toEqual([31, 2, 4]);
  expect(r.pedidos[0]).not.toHaveProperty("choferTelefono");
  expect(api).toHaveBeenCalledWith("/api/envios/consulta?pagina=2&limite=10&orden=recientes&estado=todos", { conAuth: true });
});
