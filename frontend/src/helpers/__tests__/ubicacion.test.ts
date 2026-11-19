import {
  convieneEnviar,
  detalleUbicacion,
  distanciaMetros,
  textoActualizacion,
  ubicacionDesdeFila,
  ubicacionVieja,
  UbicacionChofer,
} from "../ubicacion";

const AHORA = Date.parse("2026-11-19T15:00:00Z");
const hace = (seg: number) => new Date(AHORA - seg * 1000).toISOString();
const punto = (extra: Partial<UbicacionChofer> = {}): UbicacionChofer => ({
  lat: -34.5875,
  lng: -58.4371,
  precisionM: 10,
  rumbo: 90,
  velocidadKmh: 30,
  actualizadoEn: hace(5),
  ...extra,
});

describe("Ubicación del chofer", () => {
  test("lee la fila que manda Realtime, con números como texto", () => {
    expect(
      ubicacionDesdeFila({ lat: "-34.587500", lng: "-58.437100", precision_m: 12, rumbo: null, velocidad_kmh: "31", actualizado_en: "2026-11-19T15:00:00Z" }),
    ).toEqual({ lat: -34.5875, lng: -58.4371, precisionM: 12, rumbo: null, velocidadKmh: 31, actualizadoEn: "2026-11-19T15:00:00Z" });
    expect(ubicacionDesdeFila(null)).toBeNull();
    expect(ubicacionDesdeFila({ lat: "x", lng: 1 })).toBeNull();
  });

  test("dice qué tan reciente es la posición", () => {
    expect(textoActualizacion(punto(), AHORA)).toBe("Ubicación en vivo");
    expect(textoActualizacion(punto({ actualizadoEn: hace(40) }), AHORA)).toBe("Ubicación de hace 40 s");
    expect(textoActualizacion(punto({ actualizadoEn: hace(180) }), AHORA)).toBe("Ubicación de hace 3 min");
    expect(textoActualizacion(punto({ actualizadoEn: hace(7200) }), AHORA)).toBe("Ubicación desactualizada");
    expect(ubicacionVieja(punto({ actualizadoEn: hace(100) }), AHORA)).toBe(false);
    expect(ubicacionVieja(punto({ actualizadoEn: hace(130) }), AHORA)).toBe(true);
  });

  test("suma la velocidad si se mueve y avisa si la precisión es mala", () => {
    expect(detalleUbicacion(punto(), AHORA)).toBe("Ubicación en vivo · 30 km/h");
    expect(detalleUbicacion(punto({ velocidadKmh: 1 }), AHORA)).toBe("Ubicación en vivo");
    expect(detalleUbicacion(punto({ precisionM: 350, velocidadKmh: null }), AHORA)).toBe("Ubicación en vivo · aprox. 350 m");
  });

  test("manda una posición nueva solo si se movió o pasó un rato", () => {
    const base = { lat: -34.6, lng: -58.4, en: 0 };
    expect(convieneEnviar(null, base)).toBe(true);
    expect(convieneEnviar(base, { lat: -34.601, lng: -58.4, en: 3_000 })).toBe(false);
    expect(convieneEnviar(base, { lat: -34.601, lng: -58.4, en: 10_000 })).toBe(true);
    expect(convieneEnviar(base, { lat: -34.60001, lng: -58.4, en: 10_000 })).toBe(false);
    expect(convieneEnviar(base, { lat: -34.6, lng: -58.4, en: 46_000 })).toBe(true);
  });

  test("mide distancias en metros", () => {
    expect(Math.round(distanciaMetros({ lat: -34.6, lng: -58.4 }, { lat: -34.601, lng: -58.4 }))).toBe(111);
  });
});
