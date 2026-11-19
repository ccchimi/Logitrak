import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export type ResultadoDescarga =
  | { exito: true; mensaje: string }
  | { exito: false; error: string; cancelado?: boolean };

const TIPO_JSON = "application/json";

function descargarEnWeb(nombre: string, contenido: string): ResultadoDescarga {
  const url = URL.createObjectURL(new Blob([contenido], { type: TIPO_JSON }));
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

// En Android se elige la carpeta con el selector del sistema (no hace falta
// ningún permiso de almacenamiento); en iOS se guarda en la app y se abre la
// hoja de compartir para mandarlo a Archivos, al mail, etc.
async function guardarEnAndroid(nombre: string, contenido: string): Promise<ResultadoDescarga> {
  const saf = FileSystem.StorageAccessFramework;
  const permiso = await saf.requestDirectoryPermissionsAsync();
  if (!permiso.granted) {
    return { exito: false, cancelado: true, error: "No elegiste dónde guardar el archivo." };
  }
  const uri = await saf.createFileAsync(permiso.directoryUri, nombre.replace(/\.json$/, ""), TIPO_JSON);
  await FileSystem.writeAsStringAsync(uri, contenido);
  return { exito: true, mensaje: `Guardamos ${nombre} en la carpeta que elegiste.` };
}

async function compartirEnIos(nombre: string, contenido: string): Promise<ResultadoDescarga> {
  const uri = `${FileSystem.cacheDirectory}${nombre}`;
  await FileSystem.writeAsStringAsync(uri, contenido);
  const r = await Share.share({ url: uri, title: nombre });
  if (r.action === Share.dismissedAction) {
    return { exito: false, cancelado: true, error: "No se compartió el archivo." };
  }
  return { exito: true, mensaje: `Listo: ${nombre}.` };
}

export async function guardarArchivo(nombre: string, contenido: string): Promise<ResultadoDescarga> {
  try {
    if (Platform.OS === "web") return descargarEnWeb(nombre, contenido);
    if (Platform.OS === "android") return await guardarEnAndroid(nombre, contenido);
    return await compartirEnIos(nombre, contenido);
  } catch {
    return { exito: false, error: "No se pudo guardar el archivo. Probá de nuevo." };
  }
}
