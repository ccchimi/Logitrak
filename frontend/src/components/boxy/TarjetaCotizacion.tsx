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
    return (
    <View style={styles.resultadoCardChat}>
        <View style={styles.resultadoHeaderRow}>
            <Text style={styles.resultadoTitulo}>Cotización de {BOT_META.nombre}</Text>
            <Text style={[styles.badgeConfianza, estiloConfianza(resultado.confianza)]}>
                Confianza {resultado.confianza} · {resultado.puntajeConfianza}%
            </Text>
        </View>

        <View style={styles.resultadoLinea}>
            <Text style={styles.resultadoLabel}>Unidad asignada</Text>
            <Text style={styles.resultadoValor}>{resultado.vehiculo.nombre}</Text>
        </View>

        <View style={styles.resultadoLinea}>
            <Text style={styles.resultadoLabel}>Tarifa dinámica</Text>
            <Text style={styles.resultadoPrecio}>{formatearARS(resultado.precio)}</Text>
        </View>

        <View style={styles.resultadoMetaRow}>
            <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Recorrido</Text>
                <Text style={styles.metaValor}>
                    {resultado.distanciaKm} km{resultado.distanciaEstimada ? ' (est.)' : ''}
                </Text>
            </View>
            <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Retiro en</Text>
                <Text style={styles.metaValor}>~{resultado.tiempos.etaRetiroMin} min</Text>
            </View>
            <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Entrega</Text>
                <Text style={styles.metaValor}>{resultado.tiempos.ventanaEntrega}</Text>
            </View>
        </View>

        <Text style={styles.resultadoSeccionTitulo}>Desglose de la tarifa</Text>
        <View style={styles.desgloseBox}>
            {resultado.desglose.map((linea, i) => (
                <View key={`${linea.concepto}-${i}`} style={styles.desgloseLinea}>
                    <Text style={styles.desgloseConcepto}>{linea.concepto}</Text>
                    <Text style={linea.tipo === 'descuento' ? styles.desgloseDescuento : styles.desgloseMonto}>
                        {linea.tipo === 'descuento' ? `−${formatearARS(Math.abs(linea.monto))}` : formatearARS(Math.abs(linea.monto))}
                    </Text>
                </View>
            ))}
        </View>

        {resultado.carga.requisitos.length > 0 && (
            <>
                <Text style={styles.resultadoSeccionTitulo}>
                    Protocolo — {resultado.carga.etiqueta}
                </Text>
                {resultado.carga.requisitos.map(req => (
                    <Text key={req} style={styles.protocoloTexto}>• {req}</Text>
                ))}
            </>
        )}

        {resultado.advertencias.length > 0 && (
            <>
                <Text style={styles.resultadoSeccionTitulo}>A tener en cuenta</Text>
                {resultado.advertencias.map(adv => (
                    <Text key={adv} style={styles.advertenciaTexto}>⚠ {adv}</Text>
                ))}
            </>
        )}

        <Text style={styles.resultadoExplicacion}>“{resultado.explicacion}”</Text>
        <Text style={styles.resultadoSla}>{resultado.sla}</Text>
        <Text style={styles.validezTexto}>
            Tarifa válida por {resultado.validezMin} minutos · Ref. {resultado.id}
        </Text>

        <TouchableOpacity
            style={styles.botonConfirmar}
            disabled={confirmando}
            onPress={() => onConfirmar(resultado)}
        >
            <Text style={styles.botonConfirmarTexto}>
                {confirmando ? 'Registrando envío…' : 'Confirmar y Solicitar Chofer'}
            </Text>
        </TouchableOpacity>
    </View>
    );
}
