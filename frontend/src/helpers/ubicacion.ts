export interface UbicacionChofer {
  lat: number;
  lng: number;
  precisionM: number | null;
  rumbo: number | null;
  velocidadKmh: number | null;
  actualizadoEn: string;
}

/** Pasado este tiempo sin novedades, el marcador se muestra como desactualizado. */
export const MS_UBICACION_VIEJA = 2 * 60_000;

/** Convierte una fila de `ubicaciones_chofer` (Realtime) al formato de la API. */
export function ubicacionDesdeFila(fila: Record<string, unknown> | null | undefined): UbicacionChofer | null {
  if (!fila) return null;
  const lat = Number(fila.lat);
  const lng = Number(fila.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    lat,
    lng,
    precisionM: num(fila.precision_m),
    rumbo: num(fila.rumbo),
    velocidadKmh: num(fila.velocidad_kmh),
    actualizadoEn: String(fila.actualizado_en ?? new Date().toISOString()),
  };
}

export function ubicacionVieja(u: UbicacionChofer, ahora = Date.now()): boolean {
  return ahora - Date.parse(u.actualizadoEn) > MS_UBICACION_VIEJA;
}

export function textoActualizacion(u: UbicacionChofer, ahora = Date.now()): string {
  const seg = Math.max(0, Math.round((ahora - Date.parse(u.actualizadoEn)) / 1000));
  if (seg < 15) return "Ubicación en vivo";
  if (seg < 60) return `Ubicación de hace ${seg} s`;
  const min = Math.round(seg / 60);
  if (min < 60) return `Ubicación de hace ${min} min`;
  return "Ubicación desactualizada";
}

/** Una línea para el panel de seguimiento: dónde está y qué tan confiable es. */
export function detalleUbicacion(u: UbicacionChofer, ahora = Date.now()): string {
  const partes = [textoActualizacion(u, ahora)];
  if (u.velocidadKmh !== null && u.velocidadKmh >= 3 && !ubicacionVieja(u, ahora)) partes.push(`${u.velocidadKmh} km/h`);
  if (u.precisionM !== null && u.precisionM > 100) partes.push(`aprox. ${u.precisionM} m`);
  return partes.join(" · ");
}

/** Decide si vale la pena mandar otra posición: se movió o pasó un rato. */
export function convieneEnviar(
  anterior: { lat: number; lng: number; en: number } | null,
  actual: { lat: number; lng: number; en: number },
  { minimoMs = 8_000, latidoMs = 45_000, metros = 15 } = {},
): boolean {
  if (!anterior) return true;
  const pasado = actual.en - anterior.en;
  if (pasado < minimoMs) return false;
  if (pasado >= latidoMs) return true;
  return distanciaMetros(anterior, actual) >= metros;
}

export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
