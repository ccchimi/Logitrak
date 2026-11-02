// Montos en pesos con el formato local ($12.500). Sin valor, muestra un guion.
export function formatearARS(monto: number | null | undefined): string {
    if (typeof monto !== 'number' || !Number.isFinite(monto)) return '—';
    return `$${Math.round(monto).toLocaleString('es-AR')}`;
}
