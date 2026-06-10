import { Platform, StyleSheet } from 'react-native';

export const COLORS = {
    bg: '#0E0E0E',
    surface: '#161616',
    card: '#1B1B1B',
    cardDeep: '#111111',
    white: '#FFFFFF',
    accent: '#FFD700',
    accentDark: '#F0C800',
    accentSoft: 'rgba(255, 215, 0, 0.12)',
    ink: '#0E0E0E',
    muted: 'rgba(255, 255, 255, 0.55)',
    mutedStrong: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    borderAccent: 'rgba(255, 215, 0, 0.30)',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    cyan: '#22D3EE',
    blue: '#3B82F6',
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
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.32,
        shadowRadius: 24,
    },
    android: { elevation: 7 },
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

    scrollContent: {
        padding: 18,
        paddingBottom: 40,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },

    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    logo: {
        color: COLORS.white,
        fontSize: 22,
        fontFamily: FONTS.title,
        letterSpacing: -0.5,
    },

    logoDot: { color: COLORS.accent },

    rolePill: {
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 6,
    },

    rolePillText: {
        color: COLORS.accent,
        fontSize: 10,
        letterSpacing: 1,
        fontFamily: FONTS.titleBold,
    },

    botonSalir: {
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
    },

    botonSalirTexto: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        fontFamily: FONTS.titleBold,
    },

    saludoBlock: {
        marginBottom: 16,
    },

    eyebrow: {
        color: COLORS.accent,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 8,
        fontFamily: FONTS.textMedium,
    },

    saludo: {
        color: COLORS.white,
        fontSize: 28,
        letterSpacing: -0.8,
        fontFamily: FONTS.title,
        marginBottom: 4,
    },

    subtitulo: {
        color: COLORS.muted,
        fontSize: 14,
        fontFamily: FONTS.text,
    },

    estadoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginBottom: 22,
    },

    estadoStripDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    estadoStripTexto: {
        color: COLORS.mutedStrong,
        fontSize: 12,
        fontFamily: FONTS.titleBold,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    idleCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: 42,
        paddingHorizontal: 26,
        alignItems: 'center',
        ...cardShadow,
    },

    idleIconWrap: {
        width: 76,
        height: 76,
        borderRadius: 24,
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    idleIcon: { fontSize: 32 },

    idleTitulo: {
        color: COLORS.white,
        fontSize: 19,
        fontFamily: FONTS.titleBold,
        marginBottom: 8,
        textAlign: 'center',
    },

    idleTexto: {
        color: COLORS.muted,
        fontSize: 14,
        lineHeight: 21,
        fontFamily: FONTS.text,
        textAlign: 'center',
        maxWidth: 340,
        marginBottom: 26,
    },

    errorTexto: {
        color: '#ff6b6b',
        fontSize: 13,
        fontFamily: FONTS.textMedium,
        textAlign: 'center',
        marginBottom: 14,
    },

    ctaPrimario: {
        backgroundColor: COLORS.accent,
        borderRadius: 14,
        minHeight: 52,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.accent,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },

    ctaPrimarioDeshabilitado: {
        backgroundColor: '#3A3A3A',
        shadowOpacity: 0,
    },

    ctaPrimarioTexto: {
        color: COLORS.ink,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.4,
    },

    // ===== TARJETA DE OFERTA =====
    ofertaCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 26,
        padding: 22,
        ...cardShadow,
    },

    ofertaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },

    ofertaTitulo: {
        color: COLORS.accent,
        fontSize: 18,
        fontFamily: FONTS.titleBold,
        flexShrink: 1,
    },

    badgePrioridad: {
        fontSize: 10,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },

    prioridadAlta: {
        color: '#FCA5A5',
        backgroundColor: 'rgba(239, 68, 68, 0.16)',
    },

    prioridadMedia: {
        color: '#FCD34D',
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
    },

    prioridadBaja: {
        color: '#93C5FD',
        backgroundColor: 'rgba(59, 130, 246, 0.16)',
    },

    referenciaTexto: {
        color: COLORS.muted,
        fontSize: 12,
        fontFamily: FONTS.textMedium,
        marginBottom: 16,
    },

    // Ruta origen → destino
    rutaBox: {
        backgroundColor: COLORS.cardDeep,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
    },

    rutaFila: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },

    rutaDotCol: {
        alignItems: 'center',
        width: 12,
        paddingTop: 4,
    },

    rutaDotOrigen: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.accent,
    },

    rutaDotDestino: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.green,
    },

    rutaLineaVertical: {
        width: 2,
        flexGrow: 1,
        minHeight: 16,
        backgroundColor: COLORS.borderStrong,
        marginVertical: 3,
    },

    rutaTextos: {
        flex: 1,
    },

    rutaLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },

    rutaValor: {
        color: COLORS.white,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        lineHeight: 20,
        marginBottom: 10,
    },

    // Carga
    cargaTexto: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        fontFamily: FONTS.textMedium,
        lineHeight: 19,
        marginBottom: 14,
    },

    cargaDestacado: {
        color: COLORS.white,
        fontFamily: FONTS.titleBold,
    },

    metricasFila: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },

    metricaCaja: {
        flex: 1,
        backgroundColor: COLORS.cardDeep,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },

    metricaLabel: {
        fontSize: 10,
        fontFamily: FONTS.textMedium,
        color: COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 3,
    },

    metricaValor: {
        fontSize: 15,
        fontFamily: FONTS.titleBold,
        color: COLORS.white,
    },

    metricaValorDestacado: {
        fontSize: 15,
        fontFamily: FONTS.titleBold,
        color: COLORS.green,
    },

    requisitosBox: {
        backgroundColor: 'rgba(34, 211, 238, 0.07)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.25)',
        padding: 13,
        marginBottom: 14,
    },

    seccionTitulo: {
        fontSize: 11,
        fontFamily: FONTS.titleBold,
        color: COLORS.cyan,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },

    requisitoTexto: {
        fontSize: 13,
        color: 'rgba(165, 243, 252, 0.85)',
        fontFamily: FONTS.textMedium,
        lineHeight: 20,
    },

    recomendacionBox: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 13,
        marginBottom: 16,
    },

    recomendacionPositiva: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.30)',
    },

    recomendacionNeutra: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.30)',
    },

    recomendacionTitulo: {
        fontSize: 13,
        fontFamily: FONTS.titleBold,
        color: COLORS.white,
        marginBottom: 3,
    },

    recomendacionMotivo: {
        fontSize: 13,
        color: COLORS.mutedStrong,
        fontFamily: FONTS.text,
        lineHeight: 19,
    },

    tarifaFila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
    },

    tarifaLabel: {
        color: COLORS.muted,
        fontSize: 12,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    tarifaValor: {
        color: COLORS.accent,
        fontSize: 26,
        fontFamily: FONTS.title,
        letterSpacing: -0.5,
    },

    tarifaNota: {
        color: COLORS.muted,
        fontSize: 12,
        fontFamily: FONTS.text,
        marginTop: 2,
    },

    botonAceptar: {
        backgroundColor: COLORS.accent,
        minHeight: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.accent,
        shadowOpacity: 0.3,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 7,
    },

    botonAceptarTexto: {
        color: COLORS.ink,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.4,
    },

    botonRechazar: {
        minHeight: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },

    botonRechazarTexto: {
        color: '#FCA5A5',
        fontSize: 13,
        fontFamily: FONTS.titleBold,
    },

    viajeCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 26,
        padding: 22,
        ...cardShadow,
    },

    viajeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        marginBottom: 18,
    },

    viajeBadgeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
    },

    viajeBadgeTexto: {
        fontSize: 11,
        fontFamily: FONTS.titleBold,
        color: COLORS.accent,
        letterSpacing: 1,
    },

    stepperRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },

    stepSegmento: {
        flex: 1,
        height: 6,
        borderRadius: 999,
        backgroundColor: COLORS.cardDeep,
    },

    stepSegmentoActivo: {
        backgroundColor: COLORS.accent,
    },

    pasoLabel: {
        color: COLORS.muted,
        fontSize: 11,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },

    estadoActual: {
        color: COLORS.white,
        fontSize: 19,
        fontFamily: FONTS.titleBold,
        marginBottom: 18,
        lineHeight: 26,
    },

    itemTexto: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        fontFamily: FONTS.textMedium,
        fontStyle: 'italic',
        marginBottom: 12,
    },

    botonEstado: {
        backgroundColor: COLORS.accent,
        minHeight: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
    },

    botonEstadoFinal: {
        backgroundColor: COLORS.green,
    },

    botonEstadoTexto: {
        color: COLORS.ink,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.4,
    },

    botonEstadoTextoFinal: {
        color: COLORS.white,
    },
});