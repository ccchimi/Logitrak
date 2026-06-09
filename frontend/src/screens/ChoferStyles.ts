import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TEMA } from '../theme/colores';

interface EstilosChofer {
    container: ViewStyle;
    header: ViewStyle;
    titulo: TextStyle;
    subtitulo: TextStyle;
    tarjetaAlerta: ViewStyle;
    alertaTitulo: TextStyle;
    alertaTexto: TextStyle;
    botonAceptar: ViewStyle;
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
    alertaTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEMA.colores.error,
        marginBottom: 10,
    },
    alertaTexto: {
        fontSize: 15,
        color: TEMA.colores.textoPrincipal,
        marginVertical: 2,
    },
    botonAceptar: {
        backgroundColor: '#10B981',
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
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