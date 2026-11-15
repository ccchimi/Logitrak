export function formatearARS(monto: number | null | undefined): string {
    if (typeof monto !== 'number' || !Number.isFinite(monto)) return '—';
    return `$${Math.round(monto).toLocaleString('es-AR')}`;
}
