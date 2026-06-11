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
    amber: '#F59E0B',
    red: '#EF4444',
};

export const FONTS = {
    title: 'DMSans_700Bold',
    titleBold: 'DMSans_700Bold',
    text: 'DMSans_400Regular',
    textMedium: 'DMSans_500Medium',
};

const panelShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
    },
    android: { elevation: 16 },
    default: {},
});

const chipShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
});

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    mapa: {
        ...StyleSheet.absoluteFillObject,
    },

    headerFlotante: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
    },

    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(14, 14, 14, 0.92)',
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        ...chipShadow,
    },

    backButtonText: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '900',
        marginTop: -2,
    },

    liveChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(14, 14, 14, 0.92)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        ...chipShadow,
    },

    liveDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: COLORS.red,
    },

    liveChipTexto: {
        color: COLORS.white,
        fontSize: 13,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },

    refChip: {
        backgroundColor: 'rgba(14, 14, 14, 0.92)',
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...chipShadow,
    },

    refChipTexto: {
        color: COLORS.muted,
        fontSize: 12,
        fontFamily: FONTS.textMedium,
    },

    estadoMapa: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    estadoMapaTexto: {
        marginTop: 12,
        color: COLORS.muted,
        fontSize: 14,
        fontFamily: FONTS.textMedium,
    },

    estadoMapaError: {
        fontSize: 15,
        color: '#FCA5A5',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: FONTS.textMedium,
        maxWidth: 420,
        lineHeight: 22,
    },

    botonCorregir: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 12,
    },

    botonCorregirTexto: {
        color: COLORS.ink,
        fontFamily: FONTS.titleBold,
        fontSize: 13,
    },

    panel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(14, 14, 14, 0.97)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: COLORS.borderStrong,
        paddingHorizontal: 20,
        paddingTop: 14,
        maxHeight: '62%',
        ...panelShadow,
    },

    panelHandle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: COLORS.borderStrong,
    },

    // Zona tappable del handle: minimiza/expande el panel para ver el mapa.
    panelToggle: {
        alignSelf: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
        marginBottom: 10,
    },

    panelToggleHint: {
        color: COLORS.muted,
        fontSize: 11,
        fontFamily: FONTS.textMedium,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },

    // Flecha del gesto en mobile (▴ / ▾), alineada al centro del handle.
    panelFlecha: {
        color: COLORS.accent,
        fontSize: 12,
        lineHeight: 13,
        textAlign: 'center',
    },

    // Barra compacta visible cuando el panel está minimizado.
    panelResumen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        paddingBottom: 4,
    },

    panelResumenTextos: {
        flex: 1,
    },

    contadorMini: {
        fontSize: 22,
        fontFamily: FONTS.title,
        color: COLORS.accent,
        letterSpacing: 0.6,
        fontVariant: ['tabular-nums'],
    },

    panelContenido: {
        paddingBottom: 10,
    },

    stepperRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },

    stepSegmento: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        backgroundColor: COLORS.card,
    },

    stepSegmentoActivo: {
        backgroundColor: COLORS.accent,
    },

    etapaKicker: {
        color: COLORS.accent,
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: FONTS.textMedium,
        marginBottom: 4,
    },

    estadoTitulo: {
        fontSize: 21,
        fontFamily: FONTS.title,
        color: COLORS.white,
        letterSpacing: -0.4,
        marginBottom: 4,
    },

    estadoDetalle: {
        fontSize: 13,
        color: COLORS.muted,
        fontFamily: FONTS.text,
        lineHeight: 19,
        marginBottom: 14,
    },

    choferCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },

    choferAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    choferAvatarTexto: {
        fontSize: 18,
    },

    choferTextos: { flex: 1 },

    choferNombre: {
        color: COLORS.white,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
    },

    choferDetalle: {
        color: COLORS.muted,
        fontSize: 12,
        fontFamily: FONTS.text,
        marginTop: 1,
    },

    choferEstado: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.35)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },

    choferEstadoDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.green,
    },

    choferEstadoTexto: {
        color: COLORS.green,
        fontSize: 11,
        fontFamily: FONTS.titleBold,
    },

    pedidoCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },

    pedidoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },

    pedidoTitulo: {
        color: COLORS.muted,
        fontSize: 11,
        fontFamily: FONTS.titleBold,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },

    pedidoPrecio: {
        color: COLORS.accent,
        fontSize: 16,
        fontFamily: FONTS.title,
    },

    pedidoProducto: {
        color: COLORS.white,
        fontSize: 15,
        fontFamily: FONTS.titleBold,
        marginBottom: 2,
    },

    pedidoVehiculo: {
        color: COLORS.mutedStrong,
        fontSize: 12,
        fontFamily: FONTS.textMedium,
        marginBottom: 12,
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
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: COLORS.accent,
    },

    rutaDotDestino: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: COLORS.green,
    },

    rutaLineaVertical: {
        width: 2,
        flexGrow: 1,
        minHeight: 12,
        backgroundColor: COLORS.borderStrong,
        marginVertical: 3,
    },

    rutaTextos: { flex: 1 },

    rutaLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontFamily: FONTS.textMedium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 1,
    },

    rutaValor: {
        color: COLORS.white,
        fontSize: 13,
        fontFamily: FONTS.titleBold,
        lineHeight: 18,
        marginBottom: 8,
    },

    slaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.accentSoft,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 14,
        gap: 12,
    },

    slaTextos: { flex: 1 },

    slaTitulo: {
        color: COLORS.accent,
        fontSize: 11,
        fontFamily: FONTS.titleBold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 3,
    },

    slaDetalle: {
        color: COLORS.mutedStrong,
        fontSize: 11,
        fontFamily: FONTS.text,
        lineHeight: 15,
    },

    contador: {
        fontSize: 30,
        fontFamily: FONTS.title,
        color: COLORS.accent,
        letterSpacing: 1,
        fontVariant: ['tabular-nums'],
    },

    contadorVencido: {
        color: COLORS.red,
    },

    slaBarTrack: {
        height: 4,
        borderRadius: 999,
        backgroundColor: COLORS.card,
        overflow: 'hidden',
        marginBottom: 14,
    },

    slaBarFill: {
        height: 4,
        borderRadius: 999,
        backgroundColor: COLORS.accent,
    },

    botonVolver: {
        backgroundColor: COLORS.accent,
        minHeight: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },

    botonVolverTexto: {
        color: COLORS.ink,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        letterSpacing: 0.4,
    },
});