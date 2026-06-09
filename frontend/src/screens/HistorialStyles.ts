import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TEMA } from '../theme/colores';

interface EstilosHistorial {
    container: ViewStyle;
    itemHistorial: ViewStyle;
    fila: ViewStyle;
    codigo: TextStyle;
    fecha: TextStyle;
    ruta: TextStyle;
    badgeVehiculo: ViewStyle;
    vehiculoTexto: TextStyle;
    precio: TextStyle;
}

export const styles = StyleSheet.create<EstilosHistorial>({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
        padding: 15,
    },
    itemHistorial: {
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    codigo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
    },
    fecha: {
        fontSize: 13,
        color: TEMA.colores.textoSecundario,
    },
    ruta: {
        fontSize: 16,
        fontWeight: '600',
        color: TEMA.colores.textoPrincipal,
        marginVertical: 4,
    },
    badgeVehiculo: {
        backgroundColor: '#E0F2FE',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    vehiculoTexto: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0369A1',
    },
    precio: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10B981',
    }
});