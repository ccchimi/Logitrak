import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { calcularRumbo, obtenerRecorrido, type Coordenada, type PuntoRuta } from '../services/seguimientoService';

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
    compacto?: boolean;
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

export default function MapaSeguimiento({ origen, destino, chofer, onEvento }: Props) {
  const tema = useTema();
    const mapRef = useRef<MapView>(null);
    const [rutaCoords, setRutaCoords] = useState<Coordenada[]>([]);
    const [idx, setIdx] = useState(0);
    const eventoRef = useRef(onEvento);
    eventoRef.current = onEvento;

    // La ruta por calles la calcula el backend con Google Directions.
    useEffect(() => {
        let vigente = true;
        setRutaCoords([]);
        obtenerRecorrido(origen, destino).then((r) => {
            if (!vigente) return;
            if (!r.exito || r.recorrido.coordenadas.length < 2) {
                if (!r.exito) console.warn('No se pudo trazar la ruta:', r.error);
                eventoRef.current?.({
                    tipo: 'alerta',
                    titulo: 'Ruta no disponible',
                    detalle: 'No se pudo trazar la ruta por calles; se muestran los puntos.',
                });
                return;
            }
            const coords = r.recorrido.coordenadas;
            setRutaCoords(coords);
            mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
            });
            eventoRef.current?.({
                tipo: 'exito',
                titulo: 'Ruta trazada',
                detalle: 'Recorrido calculado por calles con Google Directions.',
            });
        });
        return () => {
            vigente = false;
        };
    }, [origen.latitude, origen.longitude, destino.latitude, destino.longitude]);

    useEffect(() => {
        if (rutaCoords.length < 2) return;
        setIdx(0);
        const stride = Math.max(1, Math.floor(rutaCoords.length / 120));
        const id = setInterval(() => {
            setIdx((prev) => {
                const siguiente = prev + stride;
                return siguiente >= rutaCoords.length ? 0 : siguiente;
            });
        }, 250);
        return () => clearInterval(id);
    }, [rutaCoords]);

    const posChofer = rutaCoords[idx] ?? origen;
    const posSiguiente = rutaCoords[Math.min(idx + 1, rutaCoords.length - 1)] ?? destino;
    const rumbo = calcularRumbo(posChofer, posSiguiente);

    return (
        <MapView
            ref={mapRef}
            style={tema.estilo({ flex: 1 })}
            provider={PROVIDER_GOOGLE}
            customMapStyle={tema.claro ? [] : ESTILO_NOCTURNO}
            showsUserLocation
            showsMyLocationButton
            initialRegion={{
                latitude: (origen.latitude + destino.latitude) / 2,
                longitude: (origen.longitude + destino.longitude) / 2,
                latitudeDelta: Math.max(0.04, Math.abs(origen.latitude - destino.latitude) * 1.8),
                longitudeDelta: Math.max(0.04, Math.abs(origen.longitude - destino.longitude) * 1.8),
            }}
        >
            <Marker
                coordinate={origen}
                title="Retiro"
                description={origen.direccion}
                pinColor="#FFD700"
            />
            <Marker
                coordinate={destino}
                title="Entrega"
                description={destino.direccion}
                pinColor="#10B981"
            />

            {rutaCoords.length > 0 && (
                <Marker
                    coordinate={posChofer}
                    title={chofer}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat
                    rotation={rumbo}
                >
                    <View style={tema.estilo(estilos.coche)}>
                        <Text style={tema.estilo(estilos.cocheEmoji)}>●</Text>
                    </View>
                </Marker>
            )}

            {rutaCoords.length > 1 && (
                <Polyline coordinates={rutaCoords} strokeWidth={4} strokeColor="#FFD700" />
            )}
        </MapView>
    );
}

const estilos = StyleSheet.create({
    coche: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cocheEmoji: {
        fontSize: 30,
    },
});
