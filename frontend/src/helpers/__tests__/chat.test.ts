import {
  estadoDeLectura,
  etiquetaDia,
  horaMensaje,
  itemsDelChat,
  MensajeChat,
  textoValido,
  unirMensajes,
} from "../chat";

const AHORA = new Date("2026-11-19T15:00:00Z");
const msj = (id: number, creadoEn: string, extra: Partial<MensajeChat> = {}): MensajeChat => ({
  id,
  autor: "cliente",
  propio: true,
  texto: `m${id}`,
  creadoEn,
  leidoEn: null,
  ...extra,
});

describe("Chat del envío", () => {
  test("muestra la hora y el día en la hora de Argentina", () => {
    expect(horaMensaje("2026-11-19T15:05:00Z")).toBe("12:05");
    expect(etiquetaDia("2026-11-19T14:00:00Z", AHORA)).toBe("Hoy");
    expect(etiquetaDia("2026-11-19T02:00:00Z", AHORA)).toBe("Ayer");
    expect(etiquetaDia("2026-11-10T15:00:00Z", AHORA)).toBe("10/11/2026");
  });

  test("separa la conversación por día", () => {
    const items = itemsDelChat([msj(1, "2026-11-18T20:00:00Z"), msj(2, "2026-11-19T13:00:00Z"), msj(3, "2026-11-19T14:00:00Z")], AHORA);
    expect(items.map((i) => (i.tipo === "dia" ? i.etiqueta : i.mensaje.id))).toEqual(["Ayer", 1, "Hoy", 2, 3]);
  });

  test("dice si el último mensaje propio ya se leyó", () => {
    expect(estadoDeLectura([])).toBeNull();
    expect(estadoDeLectura([msj(1, "2026-11-19T14:00:00Z", { propio: false })])).toBeNull();
    expect(estadoDeLectura([msj(1, "2026-11-19T14:00:00Z"), msj(2, "2026-11-19T14:01:00Z", { propio: false })])).toEqual({ id: 1, texto: "Enviado" });
    expect(estadoDeLectura([msj(1, "2026-11-19T14:00:00Z", { leidoEn: "2026-11-19T14:02:00Z" })])).toEqual({ id: 1, texto: "Leído 11:02" });
  });

  test("valida el texto antes de mandarlo", () => {
    expect(textoValido("   ")).toBe("Escribí un mensaje.");
    expect(textoValido("x".repeat(1001))).toMatch(/1000/);
    expect(textoValido(" hola ")).toBeNull();
  });

  test("une lo local con lo del servidor sin duplicar y en orden", () => {
    const local = [msj(2, "2026-11-19T14:01:00Z")];
    const servidor = [msj(1, "2026-11-19T14:00:00Z"), msj(2, "2026-11-19T14:01:00Z", { leidoEn: "2026-11-19T14:03:00Z" })];
    const unidos = unirMensajes(local, servidor);
    expect(unidos.map((m) => m.id)).toEqual([1, 2]);
    expect(unidos[1].leidoEn).toBe("2026-11-19T14:03:00Z");
  });
});
