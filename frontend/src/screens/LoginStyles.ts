import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        overflow: 'hidden',
    },

    circleArea: {
        position: 'relative',
        width: 700,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },

    circleContainer: {
        position: 'absolute',
        width: 700,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },

    barWrapper: {
        position: 'absolute',
        width: 700,
        height: 700,
        alignItems: 'center',
    },

    bar: {
        width: 8,
        height: 35,
        backgroundColor: '#525252',
        borderRadius: 4,
    },

    barActive: {
        backgroundColor: '#ffa500',
        shadowColor: '#ffa500',
        shadowOpacity: 0.8,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    loginBox: {
        position: 'relative',
        zIndex: 10,
        width: Math.min(width - 40, 420),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 32,
        borderRadius: 20,
        shadowColor: '#ffa500',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 12,
    },

    titulo: {
        textAlign: 'center',
        color: '#ffa500',
        marginBottom: 30,
        fontSize: 32,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },

    inputGroup: {
        position: 'relative',
        marginBottom: 25,
    },

    input: {
        width: '100%',
        height: 48,
        paddingLeft: 15,
        paddingRight: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 25,
        color: '#fff',
        fontSize: 14,
    },

    inputIcon: {
        position: 'absolute',
        right: 15,
        top: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 16,
    },

    forgetPassword: {
        alignItems: 'flex-end',
        marginTop: -15,
        marginBottom: 25,
    },

    forgetPasswordText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    },

    buttonShadow: {
        width: '100%',
        borderRadius: 25,
        shadowColor: '#ffa500',
        shadowOpacity: 0.5,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
    },

    loginButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    socialLogin: {
        marginTop: 25,
        alignItems: 'center',
    },

    socialText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        marginBottom: 15,
    },

    socialIcons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },

    socialIconDark: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },

    socialIconText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },

    signupLink: {
        marginTop: 25,
        alignItems: 'center',
    },

    signupText: {
        color: '#ffa500',
        fontSize: 14,
        fontWeight: '600',
    },

    errorTexto: {
        color: '#ff6b6b',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 18,
        fontWeight: '500',
    },
});