import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles as s } from "../../styles/PostulacionStyles";
import type { DatosChofer } from "../../helpers/postulacion";
import type { VehiculoFlota } from "../../services/vehiculosService";
import type { ResultadoEscaneo } from "../EscanerIdentidad";

type Props = {
  datos: DatosChofer;
  vehiculo?: VehiculoFlota;
  escaneo: ResultadoEscaneo | null;
  enviando: boolean;
  onEditar: (paso: number) => void;
};

export default function PasoRevision({ datos, vehiculo, escaneo, enviando, onEditar }: Props) {
  const tema = useTema();
  const bloques = [
    {
      titulo: "Datos personales y contacto",
      destino: 0,
      valores: [
        ["Nombre", datos.nombreCompleto],
        ["DNI", datos.dni],
        ["Email", datos.email],
        ["Teléfono", datos.telefono],
        ["Domicilio", datos.domicilio],
      ],
    },
    {
      titulo: "Vehículo",
      destino: 1,
      valores: [["Unidad", vehiculo?.nombre ?? "Sin seleccionar"]],
    },
    {
      titulo: "Identidad",
      destino: 2,
      valores: [["Documentación", escaneo ? "DNI y selfie listos para enviar" : "Pendiente"]],
    },
  ];

  return (
    <View style={tema.estilo(s.fields)}>
      {bloques.map((b) => (
        <View key={b.titulo} style={tema.estilo(s.review)}>
          <View style={tema.estilo(s.reviewHeader)}>
            <Text style={tema.estilo([s.vehicleTitle, { flex: 1 }])}>{b.titulo}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${b.titulo}`}
              disabled={enviando}
              onPress={() => onEditar(b.destino)}
              style={tema.estilo(s.edit)}
            >
              <Text style={tema.estilo(s.editText)}>Editar</Text>
            </Pressable>
          </View>
          {b.valores.map(([label, valor]) => (
            <View key={label} style={tema.estilo(s.reviewRow)}>
              <Text style={tema.estilo(s.description)}>{label}</Text>
              <Text style={tema.estilo(s.reviewValue)}>{valor}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={tema.estilo(s.description)}>
        Al enviar, validamos tu identidad con la información ingresada. Si hay un
        error, podés corregirlo sin completar todo de nuevo.
      </Text>
    </View>
  );
}
