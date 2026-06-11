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
    cyan: '#22D3EE',
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

    // ===== RESUMEN =====
    resumenRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },

    resumenCaja: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        ...cardShadow,
    },

    resumenLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },

    resumenValor: {
        color: COLORS.white,
        fontSize: 20,
        fontFamily: FONTS.title,
        letterSpacing: -0.5,
    },

    resumenValorAcento: {
        color: COLORS.accent,
        fontSize: 20,
        fontFamily: FONTS.title,
        letterSpacing: -0.5,
    },

    itemHistorial: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        ...cardShadow,
    },

    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    codigo: {
        color: COLORS.white,
        fontSize: 15,
        fontFamily: FONTS.titleBold,
    },

    fechaChip: {
        backgroundColor: COLORS.cardDeep,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },

    fecha: {
        color: COLORS.muted,
        fontSize: 11,
        fontFamily: FONTS.textMedium,
    },

    rutaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.cardDeep,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12,
        marginBottom: 12,
    },

    rutaDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
    },

    rutaFlecha: {
        color: COLORS.muted,
        fontSize: 13,
        fontFamily: FONTS.titleBold,
    },

    ruta: {
        color: COLORS.mutedStrong,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        flexShrink: 1,
    },

    badgeVehiculo: {
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexShrink: 1,
    },

    vehiculoTexto: {
        color: COLORS.accent,
        fontSize: 12,
        fontFamily: FONTS.textMedium,
    },

    precio: {
        color: COLORS.accent,
        fontSize: 18,
        fontFamily: FONTS.title,
        letterSpacing: -0.4,
    },

    estadoEntregado: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },

    estadoDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.green,
    },

    estadoTexto: {
        color: COLORS.green,
        fontSize: 12,
        fontFamily: FONTS.titleBold,
    },
});