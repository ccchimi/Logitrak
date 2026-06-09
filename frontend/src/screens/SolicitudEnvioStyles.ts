import { StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
        padding: 20,
    },
    formulario: {
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    columnaMedio: {
        width: '48%',
    },
    botonCalcular: {
        backgroundColor: TEMA.colores.primario,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    botonTexto: {
        color: TEMA.colores.blanco,
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorTexto: {
        color: TEMA.colores.error,
        fontWeight: '500',
        marginBottom: 10,
        textAlign: 'center',
    },
    // Contenedor del resultado inteligente (Simulación de asignación de vehículo y precio)
    resultadoCard: {
        marginTop: 20,
        backgroundColor: '#EFF6FF', // Azul suave de info
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    resultadoTitulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: TEMA.colores.primario,
        marginBottom: 5,
    },
    resultadoDetalle: {
        fontSize: 15,
        color: TEMA.colores.textoPrincipal,
        marginVertical: 2,
    }
});