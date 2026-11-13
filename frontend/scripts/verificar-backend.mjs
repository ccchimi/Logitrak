import 'dotenv/config';

const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

try {
    const respuesta = await fetch(new URL('/api/salud', base), {
        signal: AbortSignal.timeout(60_000),
    });
    const salud = await respuesta.json();
    if (!respuesta.ok || salud.exito !== true || salud.baseDeDatos !== 'conectada') {
        throw new Error(`La API respondió HTTP ${respuesta.status}, estado ${salud.estado || 'desconocido'}.`);
    }
    console.log(`API en línea. Base de datos conectada. Estado: ${salud.estado}.`);
} catch (error) {
    console.error('No se pudo verificar el backend:', error.message);
    process.exitCode = 1;
}
