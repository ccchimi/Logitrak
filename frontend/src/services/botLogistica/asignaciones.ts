import { BANCO_VIAS, CATEGORIAS_CARGA, CONFIG_OPERATIVA, FLOTA, LOCALIDADES } from './conocimiento';
import { distanciaHaversineKm } from './direcciones';
import { cotizarSync } from './tarifas';
import {
    AsignacionViaje,
    CategoriaCargaId,
    Localidad,
    PrioridadViaje,
    RecomendacionBot,
    SolicitudCotizacion,
} from './types';

function entre(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function enteroEntre(min: number, max: number): number {
    return Math.floor(entre(min, max + 1));
}

function elegir<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function elegirPonderado<T>(items: readonly T[], peso: (item: T) => number): T {
    const pesos = items.map(peso);
    const total = pesos.reduce((a, b) => a + b, 0);
    let acumulado = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        acumulado -= pesos[i];
        if (acumulado <= 0) return items[i];
    }
    return items[items.length - 1];
}

function generarDireccion(localidad: Localidad): string {
    const banco = BANCO_VIAS[localidad.id] ?? BANCO_VIAS.generico;
    const { via, alturaMax } = elegir(banco);
    const altura = Math.max(100, Math.round(entre(100, alturaMax) / 10) * 10);
    return `${via} ${altura}, ${localidad.nombre}`;
}

function elegirDestino(origen: Localidad): Localidad {
    if (Math.random() < 0.55) return origen;

    const candidatas = LOCALIDADES.filter((l) => l.id !== origen.id);
    return elegirPonderado(candidatas, (l) => {
        const km = distanciaHaversineKm(origen, l);
        return 1 / (1 + km / 120);
    });
}

const PLANTILLAS_CARGA: Partial<Record<CategoriaCargaId, readonly string[]>> = {
    documentos: ['Sobres con documentación legal', 'Expedientes para escribanía', 'Carpetas de licitación selladas'],
    electronica: ['Caja con repuestos electrónicos', 'Monitor 27" embalado en origen', 'Lote de notebooks corporativas'],
    fragil: ['Vajilla de porcelana embalada', 'Espejo de pared 120×80 cm', 'Cuadros enmarcados con vidrio'],
    refrigerado: ['Insumos lácteos refrigerados', 'Cajas de alimentos congelados', 'Pescado fresco en conservadoras'],
    medicinal: ['Insumos médicos para clínica privada', 'Medicamentos con cadena de frío', 'Material quirúrgico estéril'],
    alimentos: ['Pedido gastronómico de catering', 'Cajones de fruta y verdura fresca', 'Producción de panadería mayorista'],
    peligroso: ['Latas de pintura industrial', 'Baterías de gel embaladas', 'Aerosoles técnicos paletizados'],
    voluminoso: ['Sillón de 3 cuerpos embalado', 'Heladera con freezer (línea blanca)', 'Colchón queen + sommier'],
    indumentaria: ['Lote mayorista de indumentaria', 'Cajas de calzado deportivo', 'Rollos de tela para taller textil'],
};

const PRIORIDAD_POR_CATEGORIA: Partial<Record<CategoriaCargaId, PrioridadViaje>> = {
    medicinal: 'alta',
    refrigerado: 'alta',
    alimentos: 'media',
    peligroso: 'media',
    voluminoso: 'media',
};

function evaluarRentabilidad(
    pagoChofer: number,
    distanciaKm: number,
    vehiculoId: (typeof FLOTA)[number]['id']
): RecomendacionBot {
    const vehiculo = FLOTA.find((v) => v.id === vehiculoId) ?? FLOTA[1];
    const referencia =
        (vehiculo.tarifaBase + distanciaKm * vehiculo.porKm) * CONFIG_OPERATIVA.comisionChofer;
    const indice = Math.round((pagoChofer / Math.max(1, referencia)) * 100) / 100;

    if (indice >= 1) {
        const sobre = Math.round((indice - 1) * 100);
        return {
            accion: 'aceptar',
            motivo:
                sobre >= 5
                    ? `Paga ${sobre}% por encima del promedio del corredor para esta unidad.`
                    : 'Paga en línea con el promedio del corredor y el retiro está cerca.',
            indiceRentabilidad: indice,
        };
    }

    return {
        accion: 'evaluar',
        motivo: `Paga ${Math.round((1 - indice) * 100)}% por debajo del promedio del corredor; conviene si estás en zona.`,
        indiceRentabilidad: indice,
    };
}


export function generarAsignacionViaje(): Promise<AsignacionViaje> {
    const asignacion = (() => {
        for (let intento = 0; intento < 4; intento++) {
            const origenLoc = elegirPonderado(LOCALIDADES, (l) => l.radioKm ** 2 * l.indiceDemanda);
            const destinoLoc = elegirDestino(origenLoc);

            const categoria = elegir(CATEGORIAS_CARGA.filter((c) => c.id !== 'general'));
            const descripcion = elegir(PLANTILLAS_CARGA[categoria.id] ?? ['Carga general consolidada']);
            const pesoKg = Math.round(entre(categoria.perfilTipico.pesoKg[0], categoria.perfilTipico.pesoKg[1]) * 10) / 10;
            const bultos = enteroEntre(categoria.perfilTipico.bultos[0], categoria.perfilTipico.bultos[1]);

            const solicitud: SolicitudCotizacion = {
                origen: generarDireccion(origenLoc),
                destino: generarDireccion(destinoLoc),
                pesoKg,
                bultos,
                descripcionCarga: descripcion,
            };

            const respuesta = cotizarSync(solicitud);
            if (!respuesta.exito) continue;

            const { cotizacion } = respuesta;
            const vehiculo = cotizacion.vehiculo;

            const pagoChofer =
                Math.round((cotizacion.precio * CONFIG_OPERATIVA.comisionChofer) / 50) * 50;

            const prioridad: PrioridadViaje =
                PRIORIDAD_POR_CATEGORIA[cotizacion.carga.categoria] ??
                (cotizacion.distanciaKm > CONFIG_OPERATIVA.umbralInterurbanoKm ? 'media' : 'baja');

            const expiraEnSeg = prioridad === 'alta' ? 45 : prioridad === 'media' ? 90 : 120;

            const viaje: AsignacionViaje = {
                id: cotizacion.id.replace('COT', 'VJ'),
                generadaEn: cotizacion.emitidaEn,
                expiraEnSeg,
                origen: solicitud.origen,
                destino: solicitud.destino,
                distanciaKm: cotizacion.distanciaKm,
                carga: {
                    descripcion,
                    categoriaEtiqueta: cotizacion.carga.etiqueta,
                    pesoKg,
                    bultos,
                },
                requisitos: cotizacion.carga.requisitos,
                vehiculoRequerido: vehiculo.nombre,
                tarifa: cotizacion.precio,
                pagoChofer,
                prioridad,
                etaRetiroMin: cotizacion.tiempos.etaRetiroMin,
                tiempoViajeMin: cotizacion.tiempos.tiempoViajeMin,
                recomendacion: evaluarRentabilidad(pagoChofer, cotizacion.distanciaKm, vehiculo.id),
            };
            return viaje;
        }
        return null;
    })();

    if (!asignacion) {
        return Promise.reject(new Error('No hay asignaciones disponibles en este momento.'));
    }

    const latenciaMs = 600 + Math.random() * 500;
    return new Promise((res) => setTimeout(() => res(asignacion), latenciaMs));
}
