import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { TEMA } from '../theme/colores';
import { calcularRumbo, type Coordenada, type PuntoRuta } from '../services/seguimientoService';

const DIRECTIONS_KEY = process.env.EXPO_PUBLIC_GOOGLE_DIRECTIONS_KEY?.trim();

interface Props {
    origen: PuntoRuta;
    destino: PuntoRuta;
    chofer: string;
}

export default function MapaSeguimiento({ origen, destino, chofer }: Props) {
    const mapRef = useRef<MapView>(null);
    const [rutaCoords, setRutaCoords] = useState<Coordenada[]>([]);
    const [idx, setIdx] = useState(0);

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
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
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
                title="Origen"
                description={origen.direccion}
                pinColor="#16A34A"
            />
            <Marker
                coordinate={destino}
                title="Destino"
                description={destino.direccion}
                pinColor={TEMA.colores.error}
            />

            {rutaCoords.length > 0 && (
                <Marker
                    coordinate={posChofer}
                    title={chofer}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat
                    rotation={rumbo}
                >
                    <View style={estilos.coche}>
                        <Text style={estilos.cocheEmoji}>🚗</Text>
                    </View>
                </Marker>
            )}

            {DIRECTIONS_KEY && (
                <MapViewDirections
                    origin={origen}
                    destination={destino}
                    apikey={DIRECTIONS_KEY}
                    strokeWidth={4}
                    strokeColor={TEMA.colores.primario}
                    onReady={(resultado) => {
                        setRutaCoords(resultado.coordinates);
                        mapRef.current?.fitToCoordinates(resultado.coordinates, {
                            edgePadding: { top: 60, right: 60, bottom: 220, left: 60 },
                        });
                    }}
                    onError={(msg) =>
                        console.warn('Error trazando la ruta (revisá la Directions API key):', msg)
                    }
                />
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
