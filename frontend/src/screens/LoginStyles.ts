import { StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: TEMA.colores.fondo,
        padding: 20,
    },
    card: {
        width: '100%',
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // Sombra para Android
    },
    titulo: {
        fontSize: 28,
        fontWeight: 'bold',
        color: TEMA.colores.primario,
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitulo: {
        fontSize: 14,
        color: TEMA.colores.textoSecundario,
        textAlign: 'center',
        marginBottom: 25,
    },
    boton: {
        width: '100%',
        height: 50,
        backgroundColor: TEMA.colores.primario,
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
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
        fontWeight: '500'
    }
});