import { Platform } from "react-native";
import * as Location from "expo-location";

export interface PosicionGps {
  lat: number;
  lng: number;
  precision: number | null;
  rumbo: number | null;
  velocidad: number | null;
}

export type PermisoGps = "concedido" | "denegado" | "apagado";

const valido = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) || v < 0 ? null : v);

const desdeCoords = (c: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}): PosicionGps => ({
  lat: c.latitude,
  lng: c.longitude,
  precision: valido(c.accuracy),
  rumbo: valido(c.heading),
  velocidad: valido(c.speed),
});

export async function pedirPermisoGps(): Promise<PermisoGps> {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "apagado";
    // El navegador pide permiso al primer pedido de posición.
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve("concedido"),
        (e) => resolve(e.code === e.PERMISSION_DENIED ? "denegado" : "concedido"),
        { maximumAge: 60_000, timeout: 15_000 },
      );
    });
  }
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (permiso.status !== "granted") return "denegado";
  return (await Location.hasServicesEnabledAsync()) ? "concedido" : "apagado";
}

/**
 * Sigue la posición del dispositivo y devuelve la función para dejar de
 * hacerlo. En la web usa navigator.geolocation directamente: el
 * watchPositionAsync web de expo-location no entrega las posiciones al
 * callback cuando el id del navegador no coincide con el suyo, y al
 * cancelarlo no corta el seguimiento del navegador.
 */
export async function seguirPosicion(
  alMover: (p: PosicionGps) => void,
  alFallar: () => void,
): Promise<() => void> {
  if (Platform.OS === "web") {
    const id = navigator.geolocation.watchPosition(
      (p) => alMover(desdeCoords(p.coords)),
      () => alFallar(),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }
  const suscripcion = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 },
    (p) => alMover(desdeCoords(p.coords)),
    () => alFallar(),
  );
  return () => suscripcion.remove();
}
