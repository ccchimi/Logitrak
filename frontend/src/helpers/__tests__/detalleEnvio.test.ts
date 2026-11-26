import type { Envio } from "../../services/enviosService";
import {
  accionesDelEnvio,
  fechaLarga,
  pesos,
  textoDeLaCarga,
  textoDelBotonDelChat,
  textoDelChat,
  tituloDelChat,
} from "../detalleEnvio";

function envio(extra: Partial<Envio> = {}): Envio {
  return {
    id: 1, codigo: "VJ-TRK-2026-000001", clienteId: 10, cotizacionId: 1,
    choferId: null, choferNombre: null, choferCodigo: null, choferTelefono: null,
    choferVehiculoId: null, choferVehiculo: null, origen: "Palermo", destino: "Belgrano",
    origenLat: null, origenLng: null, destinoLat: null, destinoLng: null,
    descripcionCarga: "Caja", categoriaCarga: "general", pesoKg: 3, bultos: 1,
    vehiculoId: "moto", vehiculoNombre: "Moto", distanciaKm: 5, precio: 5000, moneda: "ARS",
    estado: "pendiente", estadoPago: "pendiente", ofertaVenceEn: null, archivadoEn: null,
    archivadoMotivo: null, slaMin: null, slaVenceEn: null,
    creadoEn: "2026-11-25T10:00:00Z", actualizadoEn: "2026-11-25T10:00:00Z", entregadoEn: null,
    ...extra,
  };
}

describe("Formatos del detalle del envío", () => {
  test("importes redondeados con la moneda, o un guion si no hay", () => {
    expect(pesos(12345.6)).toMatch(/^\$12\.346 ARS$/);
    expect(pesos(null)).toBe("—");
  });

  test("fecha inválida o vacía se muestra con un guion", () => {
    expect(fechaLarga(null)).toBe("—");
    expect(fechaLarga("no es fecha")).toBe("—");
  });

  test("resume peso y bultos", () => {
    expect(textoDeLaCarga({ pesoKg: 3, bultos: 2 })).toBe("3 kg · 2 bultos");
    expect(textoDeLaCarga({ pesoKg: 3, bultos: null })).toBe("3 kg");
    expect(textoDeLaCarga({ pesoKg: null, bultos: null })).toBe("");
  });
});

describe("Chat del envío", () => {
  test("el título depende de quién mira", () => {
    expect(tituloDelChat(true, false)).toBe("Chat con el chofer");
    expect(tituloDelChat(false, true)).toBe("Chat del envío");
    expect(tituloDelChat(false, false)).toBe("Chat con el cliente");
  });

  test("avisa los mensajes sin leer en singular y plural", () => {
    expect(textoDelChat({ abierto: true, mensajes: 4, noLeidos: 1 }, true)).toBe("Tenés 1 mensaje nuevo.");
    expect(textoDelChat({ abierto: true, mensajes: 4, noLeidos: 3 }, true)).toBe("Tenés 3 mensajes nuevos.");
    expect(textoDelBotonDelChat({ abierto: true, mensajes: 4, noLeidos: 3 })).toBe("Abrir chat (3)");
  });

  test("sin mensajes nuevos invita a coordinar según el rol", () => {
    expect(textoDelChat({ abierto: true, mensajes: 0, noLeidos: 0 }, true)).toMatch(/con el chofer/);
    expect(textoDelChat({ abierto: true, mensajes: 0, noLeidos: 0 }, false)).toMatch(/con el cliente/);
    expect(textoDelBotonDelChat({ abierto: true, mensajes: 0, noLeidos: 0 })).toBe("Abrir chat");
  });

  test("cerrado, muestra cuántos mensajes hubo", () => {
    expect(textoDelChat({ abierto: false, mensajes: 1, noLeidos: 0 }, true)).toBe("La conversación quedó cerrada (1 mensaje).");
    expect(textoDelChat({ abierto: false, mensajes: 0, noLeidos: 0 }, true)).toBe("Este envío no tuvo mensajes.");
    expect(textoDelBotonDelChat({ abierto: false, mensajes: 5, noLeidos: 0 })).toBe("Ver conversación");
  });
});

describe("Qué puede hacer quien mira el envío", () => {
  test("el cliente cancela solo mientras ningún chofer lo tomó", () => {
    expect(accionesDelEnvio(envio(), 10).puedeCancelar).toBe(true);
    expect(accionesDelEnvio(envio({ choferNombre: "Ana" }), 10).puedeCancelar).toBe(false);
    expect(accionesDelEnvio(envio({ estado: "asignado" }), 10).puedeCancelar).toBe(false);
    expect(accionesDelEnvio(envio({ archivadoEn: "2026-11-25T11:00:00Z" }), 10).puedeCancelar).toBe(false);
  });

  test("otro usuario no puede cancelar ni calificar", () => {
    const a = accionesDelEnvio(envio({ estado: "entregado", choferId: 5 }), 99);
    expect(a).toEqual({ esCliente: false, puedeCalificar: false, puedeCancelar: false });
  });

  test("el cliente califica cuando se entregó con chofer", () => {
    expect(accionesDelEnvio(envio({ estado: "entregado", choferId: 5 }), 10).puedeCalificar).toBe(true);
    expect(accionesDelEnvio(envio({ estado: "entregado", choferId: null }), 10).puedeCalificar).toBe(false);
  });
});
