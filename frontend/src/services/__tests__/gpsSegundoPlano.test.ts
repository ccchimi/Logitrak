jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("../asignacionesService", () => ({ publicarUbicacion: jest.fn() }));

import {
  detenerSegundoPlano,
  iniciarSegundoPlano,
  procesarPosiciones,
  reiniciarEstadoDeTarea,
  segundoPlanoActivo,
  segundoPlanoSoportado,
} from "../gpsSegundoPlano";

const pos = (lat: number, lng: number, extra = {}) => ({
  coords: { latitude: lat, longitude: lng, accuracy: 8, heading: 90, speed: 10, ...extra },
  timestamp: 0,
});

beforeEach(() => reiniciarEstadoDeTarea());

describe("GPS del chofer en segundo plano", () => {
  test("en la web no está disponible y no hace nada", async () => {
    expect(segundoPlanoSoportado).toBe(false);
    expect(await iniciarSegundoPlano()).toBe("no_disponible");
    expect(await segundoPlanoActivo()).toBe(false);
    await expect(detenerSegundoPlano()).resolves.toBeUndefined();
  });

  test("manda la última posición de la tanda, con los datos del GPS", async () => {
    const publicar = jest.fn().mockResolvedValue({ exito: true });
    const r = await procesarPosiciones([pos(-34.6, -58.4), pos(-34.61, -58.41)], publicar, 1_000);
    expect(r).toBe("enviada");
    expect(publicar).toHaveBeenCalledWith({ lat: -34.61, lng: -58.41, precision: 8, rumbo: 90, velocidad: 10 });
  });

  test("no manda si no se movió y pasó poco tiempo; sí si pasó el latido", async () => {
    const publicar = jest.fn().mockResolvedValue({ exito: true });
    await procesarPosiciones([pos(-34.6, -58.4)], publicar, 0);
    expect(await procesarPosiciones([pos(-34.6, -58.4)], publicar, 10_000)).toBe("omitida");
    expect(await procesarPosiciones([pos(-34.6, -58.4)], publicar, 50_000)).toBe("enviada");
    expect(publicar).toHaveBeenCalledTimes(2);
  });

  test("descarta valores inválidos del GPS (rumbo o velocidad negativos)", async () => {
    const publicar = jest.fn().mockResolvedValue({ exito: true });
    await procesarPosiciones([pos(-34.6, -58.4, { heading: -1, speed: -1, accuracy: null })], publicar, 0);
    expect(publicar).toHaveBeenCalledWith(expect.objectContaining({ rumbo: null, velocidad: null, precision: null }));
  });

  test("avisa cuando el viaje terminó, para apagar la tarea", async () => {
    const publicar = jest.fn().mockResolvedValue({ exito: false, sinViaje: true, error: "No tenés un viaje en curso" });
    expect(await procesarPosiciones([pos(-34.6, -58.4)], publicar, 0)).toBe("viaje_terminado");
    const falla = jest.fn().mockRejectedValue(new Error("sin red"));
    reiniciarEstadoDeTarea();
    expect(await procesarPosiciones([pos(-34.6, -58.4)], falla, 0)).toBe("error");
    expect(await procesarPosiciones([], publicar, 0)).toBe("omitida");
  });
});
