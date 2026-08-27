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
    greenSoft: 'rgba(16, 185, 129, 0.14)',
    amber: '#F59E0B',
    red: '#EF4444',
    redSoft: 'rgba(239, 68, 68, 0.14)',
    mpBlue: '#00B1EA',
    modoViolet: '#7B5CFF',
};

const cardShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
    },
    android: { elevation: 10 },
    default: {},
});

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 48,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 12,
    },
    backButtonText: {
        color: COLORS.white,
        fontSize: 20,
        marginTop: -2,
    },
    headerKicker: {
        color: COLORS.accent,
        fontSize: 11,
        letterSpacing: 1.6,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '800',
    },

    montoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        padding: 20,
        marginBottom: 22,
        ...cardShadow,
    },
    montoLabel: {
        color: COLORS.muted,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    montoValor: {
        color: COLORS.white,
        fontSize: 34,
        fontWeight: '900',
    },
    montoRef: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        marginTop: 6,
    },

    seccionTitulo: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
    },

    metodoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 12,
    },
    metodoIcono: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    metodoIconoTexto: {
        fontSize: 22,
    },
    metodoTextos: {
        flex: 1,
    },
    metodoNombre: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
    },
    metodoDetalle: {
        color: COLORS.muted,
        fontSize: 12,
        marginTop: 3,
    },
    metodoChevron: {
        color: COLORS.muted,
        fontSize: 22,
    },

    panel: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        ...cardShadow,
    },
    panelHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    panelTitulo: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
    cambiarMetodo: {
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: '700',
    },

    sandboxBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accentSoft,
        borderColor: COLORS.borderAccent,
        borderWidth: 1,
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 14,
    },

    qrWrapper: {
        alignSelf: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 14,
        marginBottom: 16,
    },
    qrImage: {
        width: 220,
        height: 220,
    },
    qrFallback: {
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrFallbackTexto: {
        color: COLORS.ink,
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    qrInstruccion: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 19,
    },

    botonPrimario: {
        backgroundColor: COLORS.accent,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 6,
    },
    botonPrimarioTexto: {
        color: COLORS.ink,
        fontSize: 15,
        fontWeight: '800',
    },
    botonSecundario: {
        backgroundColor: 'transparent',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    botonSecundarioTexto: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '700',
    },
    botonDeshabilitado: {
        opacity: 0.5,
    },
    esperandoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
    },
    esperandoTexto: {
        color: COLORS.muted,
        fontSize: 13,
    },

    inputLabel: {
        color: COLORS.mutedStrong,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: COLORS.cardDeep,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        color: COLORS.white,
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    },
    inputMarcaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    marcaPill: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    filaDoble: {
        flexDirection: 'row',
        gap: 12,
    },
    columna: {
        flex: 1,
    },
    cuotasRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    cuotaChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        backgroundColor: COLORS.cardDeep,
    },
    cuotaChipActiva: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.accentSoft,
    },
    cuotaChipTexto: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        fontWeight: '600',
    },
    cuotaChipTextoActiva: {
        color: COLORS.accent,
    },
    aclaracionSimulado: {
        color: COLORS.muted,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 14,
        textAlign: 'center',
    },

    exitoIcono: {
        alignSelf: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.greenSoft,
        borderWidth: 1,
        borderColor: COLORS.green,
        marginBottom: 16,
    },
    exitoIconoTexto: {
        color: COLORS.green,
        fontSize: 30,
        fontWeight: '900',
    },
    exitoTitulo: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    exitoSub: {
        color: COLORS.mutedStrong,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 18,
    },
    comprobanteBox: {
        backgroundColor: COLORS.cardDeep,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 18,
    },
    comprobanteLinea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    comprobanteLabel: {
        color: COLORS.muted,
        fontSize: 13,
    },
    comprobanteValor: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
    },
});
