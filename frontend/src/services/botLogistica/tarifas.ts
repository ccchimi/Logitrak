import { clasificarCarga } from './cargas';
import { CONFIG_OPERATIVA, FLOTA } from './conocimiento';
import { analizarDireccion, esMismaDireccion, estimarDistancia } from './direcciones';
import {
    AnalisisDireccion,
    Cotizacion,
    EstimacionTiempos,
    FactoresContexto,
    LineaDesglose,
    NivelConfianza,
    PerfilCarga,
    ProblemaDeteccion,
    RespuestaCotizacion,
    SolicitudCotizacion,
    VehiculoFlota,
} from './types';

function nivelDesdePuntaje(puntaje: number): NivelConfianza {
    if (puntaje >= 75) return 'alta';
    if (puntaje >= 50) return 'media';
    return 'baja';
}

function generarId(prefijo: string): string {
    const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefijo}-${Date.now().toString(36).toUpperCase()}-${azar}`;
}

export function calcularFactoresContexto(
    fecha: Date,
    origen: AnalisisDireccion,
    destino: AnalisisDireccion
): FactoresContexto {
    const hora = fecha.getHours();
    const franja = CONFIG_OPERATIVA.franjasHorarias.find((f) => hora >= f.desde && hora < f.hasta);

    const multiplicadorHorario = franja?.multiplicador ?? 1;
    const multiplicadorDia = CONFIG_OPERATIVA.multiplicadorPorDia[fecha.getDay()] ?? 1;

    const demandas = [origen.localidad?.indiceDemanda, destino.localidad?.indiceDemanda].filter(
        (d): d is number => typeof d === 'number'
    );
    const multiplicadorDemanda = demandas.length
        ? demandas.reduce((a, b) => a + b, 0) / demandas.length
        : 1;

    const etiquetas: string[] = [];
    if (franja) etiquetas.push(`franja ${franja.nombre}`);
    const dia = fecha.getDay();
    if (dia === 0) etiquetas.push('operativa de domingo');
    else if (dia === 6) etiquetas.push('operativa de sábado');
    else if (dia === 5) etiquetas.push('viernes de alta rotación');
    if (multiplicadorDemanda > 1.02) etiquetas.push('plaza de alta demanda');
    if (multiplicadorDemanda < 0.98) etiquetas.push('plaza de baja demanda');

    return {
        descripcionFranja: etiquetas.length ? etiquetas.join(' + ') : 'horario valle',
        multiplicadorHorario,
        multiplicadorDia,
        multiplicadorDemanda,
    };
}

interface SeleccionVehiculo {
    vehiculo: VehiculoFlota;
    motivo: string;
    costoEstimado: number;
}

export function seleccionarVehiculo(
    pesoFacturableKg: number,
    bultos: number,
    volumenDm3: number,
    carga: PerfilCarga,
    distanciaKm: number
): SeleccionVehiculo | null {
    const candidatos = FLOTA.filter((v) => {
        if (pesoFacturableKg > v.maxKg || bultos > v.maxBultos || volumenDm3 > v.maxVolumenDm3) {
            return false;
        }
        if (carga.capacidadRequerida && !v.capacidades.includes(carga.capacidadRequerida)) {
            return false;
        }
        return true;
    });

    if (candidatos.length === 0) return null;

    let mejor: SeleccionVehiculo | null = null;
    for (const vehiculo of candidatos) {
        const costo =
            vehiculo.tarifaBase +
            Math.ceil(pesoFacturableKg) * vehiculo.porKg +
            bultos * vehiculo.porBulto +
            distanciaKm * vehiculo.porKm;
        if (!mejor || costo < mejor.costoEstimado) {
            const razones: string[] = [`cubre ${Math.ceil(pesoFacturableKg)} kg facturables y ${bultos} bulto(s)`];
            if (carga.capacidadRequerida === 'cadena_frio') razones.push('equipado con cadena de frío');
            if (carga.capacidadRequerida === 'carga_voluminosa') razones.push('apto carga voluminosa');
            if (carga.capacidadRequerida === 'mercancia_peligrosa') razones.push('habilitado para mercancía regulada');
            razones.push('es la unidad de menor costo para este tramo');
            mejor = { vehiculo, motivo: razones.join(', '), costoEstimado: costo };
        }
    }

    return mejor;
}

function formatearHora(fecha: Date): string {
    const h = fecha.getHours().toString().padStart(2, '0');
    const m = fecha.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

export function estimarTiempos(
    fecha: Date,
    distanciaKm: number,
    vehiculo: VehiculoFlota,
    factores: FactoresContexto
): EstimacionTiempos {
    const congestion = Math.max(factores.multiplicadorHorario, 1);
    const etaRetiroMin = Math.min(40, Math.round((10 + distanciaKm * 0.12) * congestion));
    const tiempoViajeMin = Math.round(((distanciaKm / vehiculo.velocidadMediaKmH) * 60 + 8) * congestion);

    const llegada = new Date(fecha.getTime() + (etaRetiroMin + tiempoViajeMin) * 60000);
    const cierreVentana = new Date(llegada.getTime() + 30 * 60000);

    const diasDespues = Math.floor((llegada.getTime() - fecha.getTime()) / 86400000);
    let ventanaEntrega: string;
    if (tiempoViajeMin >= 1440) {
        ventanaEntrega = `Entrega estimada en ${Math.round(tiempoViajeMin / 1440)} día(s) (~${formatearHora(llegada)} h)`;
    } else if (diasDespues >= 1 || llegada.getDate() !== fecha.getDate()) {
        ventanaEntrega = `Mañana, ${formatearHora(llegada)} – ${formatearHora(cierreVentana)} h`;
    } else {
        ventanaEntrega = `Hoy, ${formatearHora(llegada)} – ${formatearHora(cierreVentana)} h`;
    }

    return { etaRetiroMin, tiempoViajeMin, ventanaEntrega };
}

function redondear(monto: number): number {
    const { redondeoARS } = CONFIG_OPERATIVA;
    return Math.round(monto / redondeoARS) * redondeoARS;
}

export function cotizarSync(solicitud: SolicitudCotizacion): RespuestaCotizacion {
    const fecha = solicitud.fecha ?? new Date();
    const { limites } = CONFIG_OPERATIVA;
    const problemas: ProblemaDeteccion[] = [];

    const origen = analizarDireccion(solicitud.origen);
    const destino = analizarDireccion(solicitud.destino);

    if (origen.veredicto === 'invalida') {
        problemas.push(...origen.problemas.filter((p) => p.severidad === 'critica'));
    }
    if (destino.veredicto === 'invalida') {
        problemas.push(...destino.problemas.filter((p) => p.severidad === 'critica'));
    }
    if (problemas.length > 0) {
        return {
            exito: false,
            motivo: 'Necesito direcciones reales de retiro y entrega para cotizar.',
            problemas,
        };
    }

    if (esMismaDireccion(origen, destino)) {
        return {
            exito: false,
            motivo: 'El punto de retiro y el de entrega son el mismo lugar.',
            problemas: [
                {
                    codigo: 'origen_igual_destino',
                    severidad: 'critica',
                    mensaje: 'Origen y destino coinciden.',
                    sugerencia: 'Revisá una de las dos direcciones.',
                },
            ],
        };
    }

    if (!isFinite(solicitud.pesoKg) || solicitud.pesoKg < limites.pesoMinKg) {
        return {
            exito: false,
            motivo: 'El peso informado no es válido.',
            problemas: [
                {
                    codigo: 'peso_invalido',
                    severidad: 'critica',
                    mensaje: `Necesito un peso real en kg (mínimo ${limites.pesoMinKg} kg).`,
                },
            ],
        };
    }
    if (solicitud.pesoKg > limites.pesoMaxKg) {
        return {
            exito: false,
            motivo: `El envío supera la capacidad máxima de la flota (${limites.pesoMaxKg} kg).`,
            problemas: [
                {
                    codigo: 'peso_fuera_de_rango',
                    severidad: 'critica',
                    mensaje: 'Carga fuera del rango operable.',
                    sugerencia: 'Para cargas industriales, contactá al área comercial.',
                },
            ],
        };
    }

    const bultos = Math.max(1, Math.floor(solicitud.bultos) || 1);
    if (bultos > limites.bultosMax) {
        return {
            exito: false,
            motivo: `Operamos hasta ${limites.bultosMax} bultos por viaje.`,
            problemas: [
                {
                    codigo: 'bultos_fuera_de_rango',
                    severidad: 'critica',
                    mensaje: 'Cantidad de bultos fuera de rango.',
                },
            ],
        };
    }

    const carga = clasificarCarga(solicitud.descripcionCarga ?? '');

    const dim = solicitud.dimensiones;
    const volumenUnitarioCm3 =
        dim?.largo && dim?.ancho && dim?.alto ? dim.largo * dim.ancho * dim.alto : 0;
    const volumenTotalDm3 = (volumenUnitarioCm3 * bultos) / 1000;

    const pesoRealKg = solicitud.pesoKg;
    const pesoVolumetricoKg = (volumenUnitarioCm3 * bultos) / CONFIG_OPERATIVA.divisorVolumetrico;
    const pesoFacturableKg = Math.max(pesoRealKg, pesoVolumetricoKg);

    const distancia = estimarDistancia(origen, destino);
    const factores = calcularFactoresContexto(fecha, origen, destino);

    const seleccion = seleccionarVehiculo(pesoFacturableKg, bultos, volumenTotalDm3, carga, distancia.km);
    if (!seleccion) {
        return {
            exito: false,
            motivo: 'Ninguna unidad de la flota puede tomar esta carga con los requisitos indicados.',
            problemas: [
                {
                    codigo: 'peso_fuera_de_rango',
                    severidad: 'critica',
                    mensaje: 'La combinación de peso, volumen y tipo de carga excede la flota disponible.',
                    sugerencia: 'Dividí el envío en más de un viaje o consultá al área comercial.',
                },
            ],
        };
    }

    const { vehiculo } = seleccion;
    const desglose: LineaDesglose[] = [];

    desglose.push({ concepto: `Cargo base — ${vehiculo.nombre}`, monto: vehiculo.tarifaBase, tipo: 'base' });
    desglose.push({
        concepto: `Flete por peso facturable (${Math.ceil(pesoFacturableKg)} kg)`,
        monto: Math.ceil(pesoFacturableKg) * vehiculo.porKg,
        tipo: 'variable',
    });
    desglose.push({
        concepto: `Manipuleo de ${bultos} bulto(s)`,
        monto: bultos * vehiculo.porBulto,
        tipo: 'variable',
    });
    desglose.push({
        concepto: `Recorrido ${distancia.km} km${distancia.estimada ? ' (estimado)' : ''}`,
        monto: Math.round(distancia.km * vehiculo.porKm),
        tipo: 'variable',
    });

    if (distancia.km > CONFIG_OPERATIVA.umbralInterurbanoKm) {
        desglose.push({
            concepto: 'Peajes y gastos de ruta estimados',
            monto: Math.ceil(distancia.km / 50) * CONFIG_OPERATIVA.peajeCada50KmARS,
            tipo: 'recargo',
        });
    }

    const subtotal = desglose.reduce((acc, l) => acc + l.monto, 0);

    if (carga.recargoPct > 0) {
        desglose.push({
            concepto: `Manejo especial — ${carga.etiqueta} (+${carga.recargoPct}%)`,
            monto: Math.round((subtotal * carga.recargoPct) / 100),
            tipo: 'recargo',
        });
    }

    if (solicitud.valorDeclarado && solicitud.valorDeclarado > 0) {
        desglose.push({
            concepto: 'Seguro de mercadería (valor declarado)',
            monto: Math.round(solicitud.valorDeclarado * CONFIG_OPERATIVA.seguroPctValorDeclarado),
            tipo: 'recargo',
        });
    }

    const subtotalConRecargos = desglose.reduce((acc, l) => acc + l.monto, 0);
    const multiplicadorTotal =
        factores.multiplicadorHorario * factores.multiplicadorDia * factores.multiplicadorDemanda;
    const ajusteDinamico = Math.round(subtotalConRecargos * (multiplicadorTotal - 1));

    if (ajusteDinamico !== 0) {
        desglose.push({
            concepto: `Ajuste dinámico (${factores.descripcionFranja})`,
            monto: ajusteDinamico,
            tipo: ajusteDinamico > 0 ? 'recargo' : 'descuento',
        });
    }

    const precio = redondear(desglose.reduce((acc, l) => acc + l.monto, 0));
    const tiempos = estimarTiempos(fecha, distancia.km, vehiculo, factores);

    const puntajeConfianza = Math.round(
        origen.puntaje * 0.32 +
            destino.puntaje * 0.32 +
            carga.puntaje * 0.2 +
            (distancia.estimada ? 45 : 95) * 0.16
    );

    const advertencias: string[] = [];
    for (const analisis of [origen, destino]) {
        for (const p of analisis.problemas) {
            if (p.severidad === 'advertencia') {
                const lado = analisis === origen ? 'Origen' : 'Destino';
                advertencias.push(`${lado}: ${p.mensaje}`);
            }
        }
    }
    if (distancia.estimada && origen.localidad?.id !== destino.localidad?.id) {
        advertencias.push('La distancia se estimó sin localidad verificada; el precio puede ajustarse al confirmar.');
    }
    if (carga.confianza === 'baja' && solicitud.descripcionCarga) {
        advertencias.push('No pude clasificar la carga con precisión: se aplicó tratamiento de carga general.');
    }

    const explicacion =
        `Asigné ${vehiculo.nombre} porque ${seleccion.motivo}. ` +
        `Calculé ${distancia.km} km (${distancia.detalle}) con ${Math.ceil(pesoFacturableKg)} kg facturables` +
        `${pesoVolumetricoKg > pesoRealKg ? ' —dominó el peso volumétrico—' : ''}` +
        ` y apliqué el ajuste de contexto por ${factores.descripcionFranja}.`;

    const sla =
        distancia.km > CONFIG_OPERATIVA.umbralInterurbanoKm
            ? `Retiro garantizado en menos de ${tiempos.etaRetiroMin + 10} min y seguimiento satelital de punta a punta.`
            : `Chofer en el punto de retiro en menos de ${tiempos.etaRetiroMin + 5} min o bonificamos el 10% del flete.`;

    const cotizacion: Cotizacion = {
        id: generarId('COT'),
        emitidaEn: fecha.toISOString(),
        validezMin: CONFIG_OPERATIVA.validezCotizacionMin,
        moneda: 'ARS',
        precio,
        desglose,
        vehiculo: { id: vehiculo.id, nombre: vehiculo.nombre, motivo: seleccion.motivo },
        distanciaKm: distancia.km,
        distanciaEstimada: distancia.estimada,
        pesoRealKg,
        pesoVolumetricoKg: Math.round(pesoVolumetricoKg * 10) / 10,
        pesoFacturableKg: Math.round(pesoFacturableKg * 10) / 10,
        carga,
        origen,
        destino,
        factores,
        tiempos,
        confianza: nivelDesdePuntaje(puntajeConfianza),
        puntajeConfianza,
        advertencias,
        explicacion,
        sla,
    };

    return { exito: true, cotizacion };
}

export function cotizarEnvio(solicitud: SolicitudCotizacion): Promise<RespuestaCotizacion> {
    const respuesta = cotizarSync(solicitud);
    const latenciaMs = 500 + Math.random() * 500;
    return new Promise((res) => setTimeout(() => res(respuesta), latenciaMs));
}
