import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/SolicitudEnvioStyles';
import { BOT_META, Cotizacion } from '../../services/botLogistica';
import { formatearARS } from '../../helpers/formato';

type Props = {
    resultado: Cotizacion;
    confirmando: boolean;
    onConfirmar: (resultado: Cotizacion) => void;
};

const estiloConfianza = (nivel: Cotizacion['confianza']) =>
    nivel === 'alta'
        ? styles.badgeConfianzaAlta
        : nivel === 'media'
          ? styles.badgeConfianzaMedia
          : styles.badgeConfianzaBaja;

// Cotización desglosada que Boxy muestra dentro del chat, con el botón para confirmarla.
export default function TarjetaCotizacion({ resultado, confirmando, onConfirmar }: Props) {
  const tema = useTema();
    return (
    <View style={tema.estilo(styles.resultadoCardChat)}>
        <View style={tema.estilo(styles.resultadoHeaderRow)}>
            <Text style={tema.estilo(styles.resultadoTitulo)}>Cotización de {BOT_META.nombre}</Text>
            <Text style={tema.estilo([styles.badgeConfianza, estiloConfianza(resultado.confianza)])}>
                Confianza {resultado.confianza} · {resultado.puntajeConfianza}%
            </Text>
        </View>

        <View style={tema.estilo(styles.resultadoLinea)}>
            <Text style={tema.estilo(styles.resultadoLabel)}>Unidad asignada</Text>
            <Text style={tema.estilo(styles.resultadoValor)}>{resultado.vehiculo.nombre}</Text>
        </View>

        <View style={tema.estilo(styles.resultadoLinea)}>
            <Text style={tema.estilo(styles.resultadoLabel)}>Tarifa dinámica</Text>
            <Text style={tema.estilo(styles.resultadoPrecio)}>{formatearARS(resultado.precio)}</Text>
        </View>

        <View style={tema.estilo(styles.resultadoMetaRow)}>
            <View style={tema.estilo(styles.metaItem)}>
                <Text style={tema.estilo(styles.metaLabel)}>Recorrido</Text>
                <Text style={tema.estilo(styles.metaValor)}>
                    {resultado.distanciaKm} km{resultado.distanciaEstimada ? ' (est.)' : ''}
                </Text>
            </View>
            <View style={tema.estilo(styles.metaItem)}>
                <Text style={tema.estilo(styles.metaLabel)}>Retiro en</Text>
                <Text style={tema.estilo(styles.metaValor)}>~{resultado.tiempos.etaRetiroMin} min</Text>
            </View>
            <View style={tema.estilo(styles.metaItem)}>
                <Text style={tema.estilo(styles.metaLabel)}>Entrega</Text>
                <Text style={tema.estilo(styles.metaValor)}>{resultado.tiempos.ventanaEntrega}</Text>
            </View>
        </View>

        <Text style={tema.estilo(styles.resultadoSeccionTitulo)}>Desglose de la tarifa</Text>
        <View style={tema.estilo(styles.desgloseBox)}>
            {resultado.desglose.map((linea, i) => (
                <View key={`${linea.concepto}-${i}`} style={tema.estilo(styles.desgloseLinea)}>
                    <Text style={tema.estilo(styles.desgloseConcepto)}>{linea.concepto}</Text>
                    <Text style={tema.estilo(linea.tipo === 'descuento' ? styles.desgloseDescuento : styles.desgloseMonto)}>
                        {linea.tipo === 'descuento' ? `−${formatearARS(Math.abs(linea.monto))}` : formatearARS(Math.abs(linea.monto))}
                    </Text>
                </View>
            ))}
        </View>

        {resultado.carga.requisitos.length > 0 && (
            <>
                <Text style={tema.estilo(styles.resultadoSeccionTitulo)}>
                    Protocolo — {resultado.carga.etiqueta}
                </Text>
                {resultado.carga.requisitos.map(req => (
                    <Text key={req} style={tema.estilo(styles.protocoloTexto)}>• {req}</Text>
                ))}
            </>
        )}

        {resultado.advertencias.length > 0 && (
            <>
                <Text style={tema.estilo(styles.resultadoSeccionTitulo)}>A tener en cuenta</Text>
                {resultado.advertencias.map(adv => (
                    <Text key={adv} style={tema.estilo(styles.advertenciaTexto)}>⚠ {adv}</Text>
                ))}
            </>
        )}

        <Text style={tema.estilo(styles.resultadoExplicacion)}>“{resultado.explicacion}”</Text>
        <Text style={tema.estilo(styles.resultadoSla)}>{resultado.sla}</Text>
        <Text style={tema.estilo(styles.validezTexto)}>
            Tarifa válida por {resultado.validezMin} minutos · Ref. {resultado.id}
        </Text>

        <TouchableOpacity
            style={tema.estilo(styles.botonConfirmar)}
            disabled={confirmando}
            onPress={() => onConfirmar(resultado)}
        >
            <Text style={tema.estilo(styles.botonConfirmarTexto)}>
                {confirmando ? 'Registrando envío…' : 'Confirmar y Solicitar Chofer'}
            </Text>
        </TouchableOpacity>
    </View>
    );
}
