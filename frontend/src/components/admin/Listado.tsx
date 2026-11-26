import React from "react";
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useTema } from "../../hooks/useTema";
import Boton from "../Boton";
import SelectorAdmin from "./SelectorAdmin";
import { PanelAdmin, TextoAdmin } from "./ElementosAdmin";
import { rangoDePagina } from "../../helpers/panelAdmin";

// Piezas de los listados del panel del equipo (pedidos y usuarios).

export const estilosListado = StyleSheet.create({
  content: {
    padding: 24,
    paddingRight: 36,
    paddingBottom: 60,
    gap: 20,
    width: "100%",
    maxWidth: 1760,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
});

interface PropsCampo {
  etiqueta: string;
  valor: string;
  placeholder: string;
  onChange: (valor: string) => void;
  maxLength?: number;
  autoCorrect?: boolean;
  estilo?: StyleProp<ViewStyle>;
}

export function CampoFiltro({ etiqueta, valor, placeholder, onChange, maxLength, autoCorrect, estilo }: PropsCampo) {
  const tema = useTema();
  return (
    <View style={[{ gap: 6 }, estilo]}>
      <TextoAdmin tipo="muted">{etiqueta}</TextoAdmin>
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tema.colores.secundario}
        autoCapitalize="none"
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        style={[
          estilosListado.input,
          { color: tema.colores.texto, borderColor: tema.colores.borde, backgroundColor: tema.colores.campo },
        ]}
      />
    </View>
  );
}

export function EncabezadoTabla({ titulos, anchos, separacion = 16, alto }: { titulos: string[]; anchos: number[]; separacion?: number; alto: number }) {
  const tema = useTema();
  return (
    <View style={[estilosListado.tableRow, { minHeight: alto, backgroundColor: tema.colores.campo, borderColor: tema.colores.borde }]}>
      {titulos.map((t, i) => (
        <View key={t} style={{ width: anchos[i], paddingRight: separacion }}>
          <TextoAdmin tipo="muted">{t}</TextoAdmin>
        </View>
      ))}
    </View>
  );
}

interface PropsPaginacion {
  pagina: number;
  paginas: number;
  total: number;
  cantidad: string;
  etiquetaCantidad: string;
  ocupado?: boolean;
  onPagina: (pagina: number) => void;
  onCantidad: (cantidad: string) => void;
}

const CANTIDADES = ["10", "25", "50", "100"].map((v) => ({ valor: v, texto: v }));

export function Paginacion({ pagina, paginas, total, cantidad, etiquetaCantidad, ocupado = false, onPagina, onCantidad }: PropsPaginacion) {
  const { desde, hasta } = rangoDePagina(pagina, Number(cantidad), total);
  return (
    <PanelAdmin>
      <View style={estilosListado.row}>
        <TextoAdmin>
          Página {pagina} de {paginas} · {desde}–{hasta} de {total}
        </TextoAdmin>
        <Boton texto="Anterior" secundario disabled={pagina <= 1 || ocupado} onPress={() => onPagina(pagina - 1)} />
        <Boton texto="Siguiente" secundario disabled={pagina >= paginas || ocupado} onPress={() => onPagina(pagina + 1)} />
        <SelectorAdmin etiqueta={etiquetaCantidad} valor={cantidad} opciones={CANTIDADES} onChange={onCantidad} />
      </View>
    </PanelAdmin>
  );
}
