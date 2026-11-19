import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as ModuloLocation from "expo-location";
import type * as ModuloTaskManager from "expo-task-manager";
import { publicarUbicacion, type ResultadoUbicacion } from "./asignacionesService";
import { convieneEnviar } from "../helpers/ubicacion";

// GPS del chofer con la app minimizada. En Android corre como servicio en
// primer plano, con una notificación fija mientras dura; en iOS, con el
// indicador azul de ubicación. No funciona en la web ni en Expo Go: hace falta
// un build propio (EAS) que incluya expo-task-manager.

export const TAREA_UBICACION = "logitrak-ubicacion-del-viaje";

const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const segundoPlanoSoportado = Platform.OS !== "web" && !enExpoGo;

// Se cargan solo donde hay módulo nativo, para no romper la web ni Expo Go.
const Location: typeof ModuloLocation | null = segundoPlanoSoportado ? require("expo-location") : null;
const TaskManager: typeof ModuloTaskManager | null = segundoPlanoSoportado ? require("expo-task-manager") : null;

interface PosicionDeTarea {
  coords: { latitude: number; longitude: number; accuracy?: number | null; heading?: number | null; speed?: number | null };
  timestamp: number;
}

let ultimoEnvio: { lat: number; lng: number; en: number } | null = null;
let enviando = false;

const valido = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) || v < 0 ? null : v);

/**
 * Lo que hace la tarea con cada tanda de posiciones: manda la última si
 * conviene (se movió o pasó un rato) y avisa si el viaje ya terminó.
 */
export async function procesarPosiciones(
  posiciones: PosicionDeTarea[],
  publicar: (p: Parameters<typeof publicarUbicacion>[0]) => Promise<ResultadoUbicacion> = publicarUbicacion,
  ahora = Date.now(),
): Promise<"enviada" | "omitida" | "viaje_terminado" | "error"> {
  const ultima = posiciones[posiciones.length - 1];
  if (!ultima || enviando) return "omitida";
  const actual = { lat: ultima.coords.latitude, lng: ultima.coords.longitude, en: ahora };
  if (!convieneEnviar(ultimoEnvio, actual)) return "omitida";
  enviando = true;
  try {
    const r = await publicar({
      lat: actual.lat,
      lng: actual.lng,
      precision: valido(ultima.coords.accuracy),
      rumbo: valido(ultima.coords.heading),
      velocidad: valido(ultima.coords.speed),
    });
    if (r.exito) {
      ultimoEnvio = actual;
      return "enviada";
    }
    return r.sinViaje ? "viaje_terminado" : "error";
  } catch {
    return "error";
  } finally {
    enviando = false;
  }
}

/** Solo para pruebas: olvida el último envío. */
export function reiniciarEstadoDeTarea() {
  ultimoEnvio = null;
  enviando = false;
}

// La tarea se define al cargar el módulo (lo importa index.ts), como pide
// expo-task-manager para que exista también si el sistema reabre la app.
if (TaskManager && !TaskManager.isTaskDefined(TAREA_UBICACION)) {
  TaskManager.defineTask<{ locations: PosicionDeTarea[] }>(TAREA_UBICACION, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const r = await procesarPosiciones(data.locations);
    if (r === "viaje_terminado") await detenerSegundoPlano();
  });
}

export type ResultadoSegundoPlano = "activo" | "sin_permiso" | "no_disponible" | "error";

export async function iniciarSegundoPlano(): Promise<ResultadoSegundoPlano> {
  if (!Location || !TaskManager) return "no_disponible";
  try {
    if (!(await TaskManager.isAvailableAsync())) return "no_disponible";
    const primerPlano = await Location.requestForegroundPermissionsAsync();
    if (primerPlano.status !== "granted") return "sin_permiso";
    // En Android 11 o más nuevo esto abre los ajustes para elegir "Permitir todo el tiempo".
    const fondo = await Location.requestBackgroundPermissionsAsync();
    if (fondo.status !== "granted") return "sin_permiso";
    if (await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION)) return "activo";
    await Location.startLocationUpdatesAsync(TAREA_UBICACION, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10_000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Logitrak está compartiendo tu ubicación",
        notificationBody: "Mientras dure el viaje, el cliente ve dónde estás. Se apaga al entregar.",
        notificationColor: "#FFDE00",
        killServiceOnDestroy: true,
      },
    });
    return "activo";
  } catch {
    return "error";
  }
}

export async function detenerSegundoPlano(): Promise<void> {
  if (!Location) return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION)) {
      await Location.stopLocationUpdatesAsync(TAREA_UBICACION);
    }
  } catch {
    // Si el servicio ya no existe, no hay nada que detener.
  }
  ultimoEnvio = null;
}

export async function segundoPlanoActivo(): Promise<boolean> {
  if (!Location) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION);
  } catch {
    return false;
  }
}
