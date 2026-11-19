export interface MensajeChat {
  id: number;
  autor: "cliente" | "chofer";
  propio: boolean;
  texto: string | null;
  /** url es null si la foto ya no se puede mostrar (por ejemplo, se borró). */
  foto: { url: string | null; tipo: string } | null;
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

export const MAX_BYTES_FOTO_CHAT = 8 * 1024 * 1024;

/** Por qué no se puede mandar todavía, o null si está todo bien. */
export function problemaParaEnviar(texto: string, fotoBase64: string | null = null): string | null {
  const limpio = texto.trim();
  if (!limpio && !fotoBase64) return "Escribí un mensaje o elegí una foto.";
  if (limpio.length > MAX_TEXTO_CHAT) return `El mensaje no puede superar los ${MAX_TEXTO_CHAT} caracteres.`;
  if (fotoBase64 && bytesDeBase64(fotoBase64) > MAX_BYTES_FOTO_CHAT) return "La foto pesa más de 8 MB. Elegí una más liviana.";
  return null;
}

/** Tamaño real de un archivo a partir de su base64 (con o sin prefijo data:). */
export function bytesDeBase64(b64: string): number {
  const limpio = b64.replace(/^data:[^,]*,/, "");
  const relleno = limpio.endsWith("==") ? 2 : limpio.endsWith("=") ? 1 : 0;
  return Math.floor((limpio.length * 3) / 4) - relleno;
}

/** Une la lista local con la del servidor sin duplicar (por id) y en orden. */
export function unirMensajes(locales: MensajeChat[], delServidor: MensajeChat[]): MensajeChat[] {
  const porId = new Map<number, MensajeChat>();
  for (const m of [...locales, ...delServidor]) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn) || a.id - b.id);
}
