import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TEMA } from '../theme/colores';

interface EstilosChofer {
    container: ViewStyle;
    header: ViewStyle;
    titulo: TextStyle;
    subtitulo: TextStyle;
    tarjetaAlerta: ViewStyle;
    alertaHeader: ViewStyle;
    alertaTitulo: TextStyle;
    alertaTexto: TextStyle;
    referenciaTexto: TextStyle;
    badgePrioridad: TextStyle;
    prioridadAlta: TextStyle;
    prioridadMedia: TextStyle;
    prioridadBaja: TextStyle;
    metricasFila: ViewStyle;
    metricaCaja: ViewStyle;
    metricaLabel: TextStyle;
    metricaValor: TextStyle;
    metricaValorDestacado: TextStyle;
    requisitosBox: ViewStyle;
    seccionTitulo: TextStyle;
    requisitoTexto: TextStyle;
    recomendacionBox: ViewStyle;
    recomendacionPositiva: ViewStyle;
    recomendacionNeutra: ViewStyle;
    recomendacionTitulo: TextStyle;
    recomendacionMotivo: TextStyle;
    botonAceptar: ViewStyle;
    botonRechazar: ViewStyle;
    botonRechazarTexto: TextStyle;
    botonTexto: TextStyle;
    tarjetaViajeActivo: ViewStyle;
    estadoBadge: ViewStyle;
    estadoTexto: TextStyle;
    botonEstado: ViewStyle;
    botonSalir: ViewStyle;
}

export const styles = StyleSheet.create<EstilosChofer>({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
    },
    subtitulo: {
        fontSize: 14,
        color: TEMA.colores.textoSecundario,
        marginBottom: 15,
        fontWeight: '500',
    },
    tarjetaAlerta: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    alertaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    alertaTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEMA.colores.error,
        marginBottom: 10,
        flexShrink: 1,
    },
    alertaTexto: {
        fontSize: 15,
        color: TEMA.colores.textoPrincipal,
        marginVertical: 2,
    },
    referenciaTexto: {
        fontSize: 12,
        color: TEMA.colores.textoSecundario,
        marginBottom: 10,
        fontWeight: '600',
    },
    badgePrioridad: {
        fontSize: 11,
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    prioridadAlta: {
        color: '#B91C1C',
        backgroundColor: '#FEE2E2',
    },
    prioridadMedia: {
        color: '#B45309',
        backgroundColor: '#FEF3C7',
    },
    prioridadBaja: {
        color: '#1D4ED8',
        backgroundColor: '#DBEAFE',
    },
    metricasFila: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        marginBottom: 4,
    },
    metricaCaja: {
        flex: 1,
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    metricaLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: TEMA.colores.textoSecundario,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metricaValor: {
        fontSize: 14,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
    },
    metricaValorDestacado: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#047857',
    },
    requisitosBox: {
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        padding: 10,
        marginTop: 10,
    },
    seccionTitulo: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0369A1',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    requisitoTexto: {
        fontSize: 13,
        color: '#075985',
        marginVertical: 1,
    },
    recomendacionBox: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        marginTop: 10,
    },
    recomendacionPositiva: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    recomendacionNeutra: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    recomendacionTitulo: {
        fontSize: 13,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
        marginBottom: 2,
    },
    recomendacionMotivo: {
        fontSize: 13,
        color: TEMA.colores.textoSecundario,
        lineHeight: 18,
    },
    botonAceptar: {
        backgroundColor: '#10B981',
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    botonRechazar: {
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    botonRechazarTexto: {
        color: '#B91C1C',
        fontSize: 14,
        fontWeight: 'bold',
    },
    botonTexto: {
        color: TEMA.colores.blanco,
        fontSize: 15,
        fontWeight: 'bold',
    },
    tarjetaViajeActivo: {
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
    },
    estadoBadge: {
        backgroundColor: '#E0F2FE',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    estadoTexto: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0369A1',
    },
    botonEstado: {
        backgroundColor: TEMA.colores.primario,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    botonSalir: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#4B5563',
        borderRadius: 6,
    },
});