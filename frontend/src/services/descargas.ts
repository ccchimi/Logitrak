import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export type ResultadoDescarga =
  | { exito: true; mensaje: string }
  | { exito: false; error: string; cancelado?: boolean };

interface Contenido {
  /** Texto (UTF-8) o, con `base64: true`, los bytes en base64. */
  datos: string;
  base64: boolean;
  tipo: string;
}

function bytesDeBase64(b64: string): Uint8Array {
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function descargarEnWeb(nombre: string, c: Contenido): ResultadoDescarga {
  const cuerpo = c.base64 ? bytesDeBase64(c.datos) : c.datos;
  const url = URL.createObjectURL(new Blob([cuerpo as BlobPart], { type: c.tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { exito: true, mensaje: `Se descargó ${nombre}.` };
}

const codificacion = (c: Contenido) =>
  c.base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8;

// En Android se elige la carpeta con el selector del sistema (no hace falta
// ningún permiso de almacenamiento); en iOS se guarda en la app y se abre la
// hoja de compartir para mandarlo a Archivos, al mail, etc.
async function guardarEnAndroid(nombre: string, c: Contenido): Promise<ResultadoDescarga> {
  const saf = FileSystem.StorageAccessFramework;
  const permiso = await saf.requestDirectoryPermissionsAsync();
  if (!permiso.granted) {
    return { exito: false, cancelado: true, error: "No elegiste dónde guardar el archivo." };
  }
  const uri = await saf.createFileAsync(permiso.directoryUri, nombre.replace(/\.[a-z0-9]+$/i, ""), c.tipo);
  await FileSystem.writeAsStringAsync(uri, c.datos, { encoding: codificacion(c) });
  return { exito: true, mensaje: `Guardamos ${nombre} en la carpeta que elegiste.` };
}

async function compartirEnIos(nombre: string, c: Contenido): Promise<ResultadoDescarga> {
  const uri = `${FileSystem.cacheDirectory}${nombre}`;
  await FileSystem.writeAsStringAsync(uri, c.datos, { encoding: codificacion(c) });
  const r = await Share.share({ url: uri, title: nombre });
  if (r.action === Share.dismissedAction) {
    return { exito: false, cancelado: true, error: "No se compartió el archivo." };
  }
  return { exito: true, mensaje: `Listo: ${nombre}.` };
}

async function guardar(nombre: string, c: Contenido): Promise<ResultadoDescarga> {
  try {
    if (Platform.OS === "web") return descargarEnWeb(nombre, c);
    if (Platform.OS === "android") return await guardarEnAndroid(nombre, c);
    return await compartirEnIos(nombre, c);
  } catch {
    return { exito: false, error: "No se pudo guardar el archivo. Probá de nuevo." };
  }
}

/** Guarda un archivo de texto (por ejemplo, JSON). */
export function guardarArchivo(nombre: string, contenido: string, tipo = "application/json") {
  return guardar(nombre, { datos: contenido, base64: false, tipo });
}

/** Guarda un PDF que llega en base64. */
export function guardarPdf(nombre: string, base64: string) {
  return guardar(nombre, { datos: base64, base64: true, tipo: "application/pdf" });
}
