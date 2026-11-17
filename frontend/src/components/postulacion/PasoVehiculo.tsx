import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import type { VehiculoFlota } from "../../services/vehiculosService";
import Boton from "../Boton";
import Icono from "../Icono";

type Props = {
  flota: VehiculoFlota[];
  cargando: boolean;
  vehiculoId: string | null;
  columnas: boolean;
  error?: string;
  onReintentar: () => void;
  onElegir: (id: string) => void;
};

export default function PasoVehiculo({
  flota,
  cargando,
  vehiculoId,
  columnas,
  error,
  onReintentar,
  onElegir,
}: Props) {
  const tema = useTema();

  let contenido: React.ReactNode;
  if (cargando) {
    contenido = (
      <View style={tema.estilo(s.loading)}>
        <ActivityIndicator color={tema.color(D.amarillo)} />
        <Text style={tema.estilo(s.description)}>Buscando vehículos de la flota…</Text>
      </View>
    );
  } else if (!flota.length) {
    contenido = (
      <View style={tema.estilo(s.note)}>
        <View style={tema.estilo({ flex: 1, gap: 16 })}>
          <Text style={tema.estilo(s.description)}>
            No pudimos cargar los vehículos. Revisá tu conexión y volvé a
            intentar.
          </Text>
          <Boton secundario texto="Reintentar" onPress={onReintentar} />
        </View>
      </View>
    );
  } else {
    contenido = (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Vehículo para trabajar"
        style={tema.estilo(s.vehicles)}
      >
        {flota.map((v) => {
          const elegido = v.id === vehiculoId;
          return (
            <Pressable
              key={v.id}
              accessibilityRole="radio"
              aria-checked={elegido}
              accessibilityState={{ checked: elegido }}
              onPress={() => onElegir(v.id)}
              style={tema.estilo([
                s.vehicle,
                columnas && { width: "48%" },
                elegido && s.vehicleActive,
              ])}
            >
              <View style={tema.estilo(s.vehicleTop)}>
                <Icono
                  nombre="truck"
                  size={28}
                  color={tema.color(elegido ? D.amarillo : "#BAC7BF")}
                />
                <View style={tema.estilo([s.radio, elegido && s.radioSelected])}>
                  {elegido && (
                    <Icono nombre="check" color={tema.color(D.fondo)} size={14} />
                  )}
                </View>
              </View>
              <Text style={tema.estilo(s.vehicleTitle)}>{v.nombre}</Text>
              <Text style={tema.estilo(s.description)}>
                Hasta {v.maxKg} kg · {v.maxBultos} bultos
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={tema.estilo(s.fields)}>
      {contenido}
      {!!error && (
        <Text accessibilityRole="alert" style={tema.estilo(s.error)}>
          {error}
        </Text>
      )}
    </View>
  );
}
