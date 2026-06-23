import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { analizarDireccion } from '../services/botLogistica';
import { calcularRumbo, type Coordenada, type PuntoRuta } from '../services/seguimientoService';

const WEB_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY?.trim();

export interface EventoMapa {
    tipo: 'exito' | 'info' | 'alerta' | 'error';
    titulo: string;
    detalle?: string;
}

interface Props {
    origen: PuntoRuta;
    destino: PuntoRuta;
    chofer: string;
    onEvento?: (evento: EventoMapa) => void;
}

let promesaGoogleMaps: Promise<any> | null = null;

function cargarGoogleMaps(clave: string): Promise<any> {
    const w = window as any;
    if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
    if (promesaGoogleMaps) return promesaGoogleMaps;

    promesaGoogleMaps = new Promise((resolve, reject) => {
        const nombreCallback = '__logitrackMapsListo';
        w[nombreCallback] = () => resolve(w.google.maps);

        const script = document.createElement('script');
        script.src =
            'https://maps.googleapis.com/maps/api/js' +
            `?key=${encodeURIComponent(clave)}&language=es&region=AR&callback=${nombreCallback}`;
        script.async = true;
        script.onerror = () => {
            promesaGoogleMaps = null;
            reject(new Error('No se pudo descargar el SDK de Google Maps.'));
        };
        document.head.appendChild(script);
    });

    return promesaGoogleMaps;
}

const ESTILO_NOCTURNO = [
    { elementType: 'geometry', stylers: [{ color: '#161616' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a8880' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e0e' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6e6c64' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#142117' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262626' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1b1b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a988f' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3415' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2b2511' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#d6b94c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222222' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1620' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5b6b' }] },
];

const PIN_PATH = 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z';

interface PuntoResuelto {
    lat: number;
    lng: number;
    etiqueta: string;
    aproximado: boolean;
}

async function resolverPunto(geocoder: any, punto: PuntoRuta): Promise<PuntoResuelto | null> {
    if (punto.latitude !== 0 || punto.longitude !== 0) {
        return { lat: punto.latitude, lng: punto.longitude, etiqueta: punto.direccion, aproximado: false };
    }

    try {
        const respuesta = await geocoder.geocode({ address: punto.direccion, region: 'AR' });
        const resultado = respuesta?.results?.[0];
        if (resultado) {
            const loc = resultado.geometry.location;
            return { lat: loc.lat(), lng: loc.lng(), etiqueta: punto.direccion, aproximado: false };
        }
    } catch (_e) {
    }

    const analisis = analizarDireccion(punto.direccion);
    if (analisis.localidad) {
        return {
            lat: analisis.localidad.lat,
            lng: analisis.localidad.lng,
            etiqueta: `${punto.direccion} (centro de ${analisis.localidad.nombre})`,
            aproximado: true,
        };
    }

    return null;
}

export default function MapaSeguimiento({ origen, destino, chofer, onEvento }: Props) {
    const contenedorRef = useRef<HTMLDivElement | null>(null);
    const limpiezaRef = useRef<(() => void) | null>(null);
    const eventoRef = useRef(onEvento);
    eventoRef.current = onEvento;

    const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
    const [mensajeError, setMensajeError] = useState('');

    useEffect(() => {
        let activo = true;
        const emitir = (evento: EventoMapa) => {
            if (activo) eventoRef.current?.(evento);
        };

        const fallar = (mensaje: string) => {
            if (!activo) return;
            setMensajeError(mensaje);
            setEstado('error');
            emitir({ tipo: 'error', titulo: 'Problema con el mapa', detalle: mensaje });
        };

        if (!WEB_MAPS_KEY) {
            fallar('Falta configurar EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY en el archivo .env.');
            return;
        }

        (window as any).gm_authFailure = () => {
            fallar('Google rechazó la clave del mapa. Verificá la API key web y sus restricciones.');
        };

        (async () => {
            let maps: any;
            try {
                maps = await cargarGoogleMaps(WEB_MAPS_KEY);
            } catch (_e) {
                fallar('No se pudo descargar Google Maps. Revisá la conexión a internet.');
                return;
            }
            if (!activo || !contenedorRef.current) return;

            const geocoder = new maps.Geocoder();
            const [puntoOrigen, puntoDestino] = await Promise.all([
                resolverPunto(geocoder, origen),
                resolverPunto(geocoder, destino),
            ]);
            if (!activo) return;

            if (!puntoOrigen || !puntoDestino) {
                const faltan = [
                    !puntoOrigen ? `el origen ("${origen.direccion}")` : null,
                    !puntoDestino ? `el destino ("${destino.direccion}")` : null,
                ].filter(Boolean);
                fallar(`No se pudo ubicar ${faltan.join(' ni ')} en el mapa.`);
                return;
            }

            if (puntoOrigen.aproximado || puntoDestino.aproximado) {
                emitir({
                    tipo: 'alerta',
                    titulo: 'Ubicación aproximada',
                    detalle: 'Una de las direcciones se ubicó por su localidad, no por la altura exacta.',
                });
            }

            const mapa = new maps.Map(contenedorRef.current, {
                center: {
                    lat: (puntoOrigen.lat + puntoDestino.lat) / 2,
                    lng: (puntoOrigen.lng + puntoDestino.lng) / 2,
                },
                zoom: 12,
                styles: ESTILO_NOCTURNO,
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions: { position: maps.ControlPosition.RIGHT_CENTER },
                backgroundColor: '#0E0E0E',
            });

            const crearPin = (color: string) => ({
                path: PIN_PATH,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#0E0E0E',
                strokeWeight: 1.6,
                scale: 1.25,
                anchor: new maps.Point(0, 0),
            });

            const marcadorOrigen = new maps.Marker({
                map: mapa,
                position: { lat: puntoOrigen.lat, lng: puntoOrigen.lng },
                title: `Retiro: ${puntoOrigen.etiqueta}`,
                icon: crearPin('#FFD700'),
            });

            const marcadorDestino = new maps.Marker({
                map: mapa,
                position: { lat: puntoDestino.lat, lng: puntoDestino.lng },
                title: `Entrega: ${puntoDestino.etiqueta}`,
                icon: crearPin('#10B981'),
            });

            const infoOrigen = new maps.InfoWindow({
                content: `<div style="color:#111;font-family:sans-serif;font-size:13px"><b>📦 Retiro</b><br/>${puntoOrigen.etiqueta}</div>`,
            });
            const infoDestino = new maps.InfoWindow({
                content: `<div style="color:#111;font-family:sans-serif;font-size:13px"><b>🏁 Entrega</b><br/>${puntoDestino.etiqueta}</div>`,
            });
            marcadorOrigen.addListener('click', () => infoOrigen.open({ map: mapa, anchor: marcadorOrigen }));
            marcadorDestino.addListener('click', () => infoDestino.open({ map: mapa, anchor: marcadorDestino }));

            let ruta: Coordenada[] = [];
            let polilinea: any = null;

            try {
                const directions = new maps.DirectionsService();
                const resultado = await directions.route({
                    origin: { lat: puntoOrigen.lat, lng: puntoOrigen.lng },
                    destination: { lat: puntoDestino.lat, lng: puntoDestino.lng },
                    travelMode: maps.TravelMode.DRIVING,
                });
                const camino = resultado?.routes?.[0]?.overview_path ?? [];
                ruta = camino.map((p: any) => ({ latitude: p.lat(), longitude: p.lng() }));
            } catch (_e) {
                ruta = [];
            }
            if (!activo) return;

            const esRutaReal = ruta.length > 1;
            if (!esRutaReal) {
                ruta = [
                    { latitude: puntoOrigen.lat, longitude: puntoOrigen.lng },
                    { latitude: puntoDestino.lat, longitude: puntoDestino.lng },
                ];
                emitir({
                    tipo: 'info',
                    titulo: 'Ruta estimada',
                    detalle: 'No se pudo trazar la ruta por calles; se muestra el trayecto directo.',
                });
            } else {
                emitir({
                    tipo: 'exito',
                    titulo: 'Ruta trazada',
                    detalle: 'Recorrido calculado por calles con Google Directions.',
                });
            }

            polilinea = new maps.Polyline({
                map: mapa,
                path: ruta.map((p) => ({ lat: p.latitude, lng: p.longitude })),
                geodesic: !esRutaReal,
                strokeColor: '#FFD700',
                strokeOpacity: 0.9,
                strokeWeight: 4,
            });

            const limites = new maps.LatLngBounds();
            ruta.forEach((p) => limites.extend({ lat: p.latitude, lng: p.longitude }));
            mapa.fitBounds(limites, { top: 80, right: 60, bottom: 120, left: 60 });

            const marcadorChofer = new maps.Marker({
                map: mapa,
                position: { lat: ruta[0].latitude, lng: ruta[0].longitude },
                title: chofer,
                zIndex: 60,
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 15,
                    fillColor: '#0E0E0E',
                    fillOpacity: 1,
                    strokeColor: '#FFD700',
                    strokeWeight: 2.5,
                },
                label: { text: '🚚', fontSize: '16px' },
            });

            const flecha = new maps.Marker({
                map: mapa,
                position: { lat: ruta[0].latitude, lng: ruta[0].longitude },
                zIndex: 59,
                clickable: false,
                icon: {
                    path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 4,
                    fillColor: '#FFD700',
                    fillOpacity: 1,
                    strokeColor: '#FFD700',
                    strokeWeight: 1,
                    rotation: 0,
                },
            });

            let indice = 0;
            const paso = Math.max(1, Math.floor(ruta.length / 120));
            const intervalo = setInterval(() => {
                indice = indice + paso >= ruta.length ? 0 : indice + paso;
                const actual = ruta[indice];
                const siguiente = ruta[Math.min(indice + paso, ruta.length - 1)];
                marcadorChofer.setPosition({ lat: actual.latitude, lng: actual.longitude });

                const rumbo = calcularRumbo(actual, siguiente);
                const desplazado = {
                    lat: actual.latitude + (siguiente.latitude - actual.latitude) * 0.35,
                    lng: actual.longitude + (siguiente.longitude - actual.longitude) * 0.35,
                };
                flecha.setPosition(desplazado);
                flecha.setIcon({
                    path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 4,
                    fillColor: '#FFD700',
                    fillOpacity: 1,
                    strokeColor: '#FFD700',
                    strokeWeight: 1,
                    rotation: rumbo,
                });
            }, 250);

            limpiezaRef.current = () => {
                clearInterval(intervalo);
                marcadorOrigen.setMap(null);
                marcadorDestino.setMap(null);
                marcadorChofer.setMap(null);
                flecha.setMap(null);
                if (polilinea) polilinea.setMap(null);
            };

            setEstado('listo');
        })();

        return () => {
            activo = false;
            limpiezaRef.current?.();
            limpiezaRef.current = null;
        };
    }, [origen.direccion, destino.direccion, origen.latitude, destino.latitude]);

    return (
        <View style={estilos.contenedor}>
            <div ref={contenedorRef} style={{ width: '100%', height: '100%' }} />

            {estado === 'cargando' && (
                <View style={estilos.overlay}>
                    <ActivityIndicator color="#FFD700" size="large" />
                    <Text style={estilos.overlayTexto}>Cargando mapa satelital…</Text>
                </View>
            )}

            {estado === 'error' && (
                <View style={estilos.overlay}>
                    <Text style={estilos.errorIcono}>🗺️</Text>
                    <Text style={estilos.errorTitulo}>No pudimos mostrar el mapa</Text>
                    <Text style={estilos.errorTexto}>{mensajeError}</Text>

                    <View style={estilos.rutaFallback}>
                        <Text style={estilos.rutaPunto}>📍 {origen.direccion}</Text>
                        <Text style={estilos.rutaFlecha}>↓</Text>
                        <Text style={estilos.rutaPunto}>🏁 {destino.direccion}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#0E0E0E',
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0E0E0E',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },

    overlayTexto: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        marginTop: 14,
        fontFamily: 'DMSans_500Medium',
    },

    errorIcono: { fontSize: 40, marginBottom: 12 },

    errorTitulo: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: 'DMSans_700Bold',
        marginBottom: 6,
        textAlign: 'center',
    },

    errorTexto: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 420,
        marginBottom: 20,
        fontFamily: 'DMSans_400Regular',
    },

    rutaFallback: {
        alignItems: 'center',
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
    },

    rutaPunto: {
        fontSize: 14,
        color: '#FFFFFF',
        fontFamily: 'DMSans_500Medium',
        textAlign: 'center',
    },

    rutaFlecha: {
        fontSize: 18,
        color: '#FFD700',
        marginVertical: 4,
    },
});