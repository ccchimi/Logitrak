import { StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 15,
    },
    bienvenida: {
        fontSize: 20,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
    },
    logoutBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: TEMA.colores.error,
        borderRadius: 6,
    },
    logoutBtnTexto: {
        color: TEMA.colores.blanco,
        fontWeight: '600',
        fontSize: 13,
    },
    listaContainer: {
        paddingBottom: 20,
    }
});