export interface MensajeChat {
  id: number;
  autor: "cliente" | "chofer";
  propio: boolean;
  texto: string;
  creadoEn: string;
  leidoEn: string | null;
}

export const MAX_TEXTO_CHAT = 1000;

const ZONA = "America/Argentina/Buenos_Aires";
const dia = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: ZONA });

export function horaMensaje(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "Hoy", "Ayer" o la fecha, para separar la conversación por día. */
export function etiquetaDia(iso: string, ahora = new Date()): string {
  const d = dia(iso);
  const hoy = dia(ahora.toISOString());
  const ayer = dia(new Date(ahora.getTime() - 86_400_000).toISOString());
  if (d === hoy) return "Hoy";
  if (d === ayer) return "Ayer";
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" });
}

export type ItemChat =
  | { tipo: "dia"; clave: string; etiqueta: string }
  | { tipo: "mensaje"; clave: string; mensaje: MensajeChat };

/** Intercala separadores de día entre los mensajes. */
export function itemsDelChat(mensajes: MensajeChat[], ahora = new Date()): ItemChat[] {
  const items: ItemChat[] = [];
  let ultimo: string | null = null;
  for (const m of mensajes) {
    const d = dia(m.creadoEn);
    if (d !== ultimo) {
      items.push({ tipo: "dia", clave: `dia-${d}`, etiqueta: etiquetaDia(m.creadoEn, ahora) });
      ultimo = d;
    }
    items.push({ tipo: "mensaje", clave: `m-${m.id}`, mensaje: m });
  }
  return items;
}

/** Debajo del último mensaje propio: si la otra parte ya lo leyó. */
export function estadoDeLectura(mensajes: MensajeChat[]): { id: number; texto: string } | null {
  const ultimo = [...mensajes].reverse().find((m) => m.propio);
  if (!ultimo) return null;
  return { id: ultimo.id, texto: ultimo.leidoEn ? `Leído ${horaMensaje(ultimo.leidoEn)}` : "Enviado" };
}

export function textoValido(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return "Escribí un mensaje.";
  if (limpio.length > MAX_TEXTO_CHAT) return `El mensaje no puede superar los ${MAX_TEXTO_CHAT} caracteres.`;
  return null;
}

/** Une la lista local con la del servidor sin duplicar (por id) y en orden. */
export function unirMensajes(locales: MensajeChat[], delServidor: MensajeChat[]): MensajeChat[] {
  const porId = new Map<number, MensajeChat>();
  for (const m of [...locales, ...delServidor]) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn) || a.id - b.id);
}
