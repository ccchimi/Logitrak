import { StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
    },
    mapa: {
        flex: 1,
    },
    cardSeguimiento: {
        backgroundColor: TEMA.colores.blanco,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    estadoTitulo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
        marginBottom: 5,
    },
    choferInfo: {
        fontSize: 15,
        color: TEMA.colores.textoSecundario,
        marginBottom: 15,
    },
    divisor: {
        height: 1,
        backgroundColor: TEMA.colores.fondo,
        marginVertical: 10,
    },
    slaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 15,
    },
    slaTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B45309',
    },
    contador: {
        fontSize: 22,
        fontWeight: 'bold',
        color: TEMA.colores.secundario,
    },
    botonVolver: {
        backgroundColor: TEMA.colores.primario,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    botonVolverTexto: {
        color: TEMA.colores.blanco,
        fontSize: 16,
        fontWeight: 'bold',
    }
});