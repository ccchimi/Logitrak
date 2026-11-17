import { contextoDeConversacion, cotizarYGuardar } from "../solicitudEnvioService";
import { cotizarEnvio } from "../botLogistica";
import { guardarCotizacion } from "../cotizacionesService";
import { EnvioData, INITIAL_DATA } from "../../helpers/pasosSolicitudEnvio";

jest.mock("../botLogistica", () => ({
  ...jest.requireActual("../botLogistica"),
  cotizarEnvio: jest.fn(),
}));
jest.mock("../cotizacionesService", () => ({ guardarCotizacion: jest.fn() }));

const cotizar = cotizarEnvio as jest.Mock;
const guardar = guardarCotizacion as jest.Mock;

const datos: EnvioData = {
  ...INITIAL_DATA,
  origen: "Av. Cabildo 2000, Belgrano",
  destino: "Av. Rivadavia 5000, Caballito",
  descripcion: "Documentación",
  peso: "2",
  bultos: "1",
  largo: "30",
};
const cotizacion = { id: "COT-1", precio: 9000, puntajeConfianza: 92 };

beforeEach(() => jest.clearAllMocks());

describe("Cotización desde el chat de Boxy", () => {
  test("cotiza, guarda y avisa la confianza; manda al servidor solo las medidas cargadas", async () => {
    cotizar.mockResolvedValue({ exito: true, cotizacion });
    guardar.mockResolvedValue({ exito: true, cotizacion, precioAjustado: false });

    const r = await cotizarYGuardar(datos);

    expect(r.cotizacion).toBe(cotizacion);
    expect(r.texto).toContain("92% de confianza");
    expect(r.texto).not.toContain("Ajusté el precio");
    expect(cotizar).toHaveBeenCalledWith(
      expect.objectContaining({ pesoKg: 2, bultos: 1, dimensiones: { largo: 30, ancho: undefined, alto: undefined } }),
    );
    expect(guardar).toHaveBeenCalledWith(
      cotizacion,
      expect.objectContaining({ largoCm: 30, anchoCm: undefined, descripcionCarga: "Documentación" }),
    );
  });

  test("si el servidor ajustó el precio, lo aclara", async () => {
    cotizar.mockResolvedValue({ exito: true, cotizacion });
    guardar.mockResolvedValue({ exito: true, cotizacion, precioAjustado: true });
    expect((await cotizarYGuardar(datos)).texto).toContain("Ajusté el precio con la tarifa vigente del servidor.");
  });

  test("si el cotizador rechaza los datos, lista cada problema con su sugerencia", async () => {
    cotizar.mockResolvedValue({
      exito: false,
      motivo: "No pude cotizar.",
      problemas: [
        { mensaje: "El destino no existe.", sugerencia: "Revisá la altura." },
        { mensaje: "Falta el peso." },
      ],
    });
    const r = await cotizarYGuardar(datos);
    expect(r.cotizacion).toBeUndefined();
    expect(r.texto).toBe(
      'No pude cotizar.\n• El destino no existe. Revisá la altura.\n• Falta el peso.\n\nTocá "Nueva cotización" para corregir los datos.',
    );
    expect(guardar).not.toHaveBeenCalled();
  });

  test("si no se puede guardar o algo falla, no devuelve cotización", async () => {
    cotizar.mockResolvedValue({ exito: true, cotizacion });
    guardar.mockResolvedValue({ exito: false, error: "Sin conexión." });
    const sinGuardar = await cotizarYGuardar(datos);
    expect(sinGuardar.cotizacion).toBeUndefined();
    expect(sinGuardar.texto).toContain("No pude registrar la cotización: Sin conexión.");

    cotizar.mockRejectedValue(new Error("caída"));
    const conError = await cotizarYGuardar(datos);
    expect(conError.cotizacion).toBeUndefined();
    expect(conError.texto).toContain("No pude calcular la cotización");
  });

  test("el contexto de la conversación interpreta lo que ya se respondió", () => {
    const c = contextoDeConversacion(datos);
    expect(c.pesoKg).toBe(2);
    expect(c.bultos).toBe(1);
    expect(c.origen).not.toBeNull();
    expect(contextoDeConversacion(INITIAL_DATA)).toEqual({ origen: null, destino: null, pesoKg: null, bultos: null });
  });
});
