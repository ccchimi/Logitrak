import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TEMA } from '../theme/colores';

// Definimos los tipos estrictos para que TypeScript no chiste con las propiedades nativas
interface EstilosPerfil {
    container: ViewStyle;
    tarjetaUsuario: ViewStyle;
    avatar: TextStyle;
    nombre: TextStyle;
    detalle: TextStyle;
    seccionTitulo: TextStyle;
    tarjetaCupon: ViewStyle;
    cuponHeader: ViewStyle;
    cuponCodigo: TextStyle;
    cuponDescuento: TextStyle;
    cuponMotivo: TextStyle;
}

export const styles = StyleSheet.create<EstilosPerfil>({
    container: {
        flex: 1,
        backgroundColor: TEMA.colores.fondo,
        padding: 20,
    },
    tarjetaUsuario: {
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
        marginBottom: 25,
    },
    avatar: {
        fontSize: 50,
        marginBottom: 10,
    },
    nombre: {
        fontSize: 22,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
    },
    detalle: {
        fontSize: 14,
        color: TEMA.colores.textoSecundario,
        marginTop: 4,
    },
    seccionTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
        marginBottom: 15,
    },
    tarjetaCupon: {
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderStyle: 'dashed',
    },
    cuponHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cuponCodigo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#B45309',
    },
    cuponDescuento: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D97706',
    },
    cuponMotivo: {
        fontSize: 13,
        color: '#78350F',
        marginTop: 6,
        fontWeight: '500',
    }
});