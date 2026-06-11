import { Platform, StyleSheet } from 'react-native';

export const COLORS = {
    bg: '#0E0E0E',
    surface: '#161616',
    card: '#1B1B1B',
    cardDeep: '#111111',
    white: '#FFFFFF',
    accent: '#FFD700',
    accentSoft: 'rgba(255, 215, 0, 0.12)',
    ink: '#0E0E0E',
    muted: 'rgba(255, 255, 255, 0.55)',
    mutedStrong: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    borderAccent: 'rgba(255, 215, 0, 0.30)',
    green: '#10B981',
};

export const FONTS = {
    title: 'DMSans_700Bold',
    titleBold: 'DMSans_700Bold',
    text: 'DMSans_400Regular',
    textMedium: 'DMSans_500Medium',
};

const cardShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    android: { elevation: 6 },
    default: {},
});

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    listContent: {
        padding: 18,
        paddingBottom: 40,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
    },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },

    backButtonText: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '900',
        marginTop: -2,
    },

    headerTextos: { flex: 1 },

    eyebrow: {
        color: COLORS.accent,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontFamily: FONTS.textMedium,
        marginBottom: 4,
    },

    titulo: {
        color: COLORS.white,
        fontSize: 26,
        letterSpacing: -0.8,
        fontFamily: FONTS.title,
    },

    tarjetaUsuario: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 14,
        ...cardShadow,
    },

    avatarCirculo: {
        width: 76,
        height: 76,
        borderRadius: 24,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },

    avatarTexto: {
        color: COLORS.ink,
        fontSize: 28,
        fontFamily: FONTS.title,
    },

    nombre: {
        color: COLORS.white,
        fontSize: 22,
        fontFamily: FONTS.title,
        letterSpacing: -0.5,
        marginBottom: 4,
    },

    cuentaPill: {
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 12,
    },

    cuentaPillTexto: {
        color: COLORS.accent,
        fontSize: 11,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },

    detalle: {
        color: COLORS.muted,
        fontSize: 13,
        fontFamily: FONTS.textMedium,
        marginBottom: 2,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 22,
    },

    statCaja: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        alignItems: 'center',
        ...cardShadow,
    },

    statValor: {
        color: COLORS.white,
        fontSize: 20,
        fontFamily: FONTS.title,
        marginBottom: 2,
    },

    statLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        textAlign: 'center',
    },

    seccionTitulo: {
        color: COLORS.white,
        fontSize: 17,
        fontFamily: FONTS.titleBold,
        marginBottom: 4,
    },

    seccionSub: {
        color: COLORS.muted,
        fontSize: 13,
        fontFamily: FONTS.text,
        marginBottom: 14,
    },

    tarjetaCupon: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderStyle: 'dashed',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
    },

    cuponHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    cuponCodigo: {
        color: COLORS.mutedStrong,
        fontSize: 12,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.6,
    },

    cuponDescuento: {
        color: COLORS.ink,
        backgroundColor: COLORS.accent,
        fontSize: 13,
        fontFamily: FONTS.title,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },

    cuponMotivo: {
        color: COLORS.muted,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: FONTS.text,
    },
});