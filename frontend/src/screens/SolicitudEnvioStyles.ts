import { Platform, StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

const COLORS = {
    black: '#0E0E0E',
    blackSoft: '#161616',
    blackCard: '#1B1B1B',
    white: TEMA.colores.blanco,
    offwhite: '#F8F8F8',
    accent: '#FFD700',
    accentSoft: 'rgba(255, 215, 0, 0.14)',
    muted: 'rgba(255, 255, 255, 0.58)',
    mutedStrong: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    success: '#10B981',
    violet: '#A855F7',
    cyan: '#22D3EE',
    pink: '#FB00D4',
};

const shadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
    },
    android: {
        elevation: 6,
    },
    default: {},
});

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.black,
    },

    keyboardAvoiding: {
        flex: 1,
    },

    container: {
        flex: 1,
        backgroundColor: COLORS.black,
    },

    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    headerCard: {
        backgroundColor: COLORS.blackSoft,
        borderRadius: 28,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...shadow,
    },

    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    headerTextBox: {
        flex: 1,
        marginLeft: 14,
    },

    headerKicker: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },

    headerTitle: {
        color: COLORS.white,
        fontSize: 31,
        fontWeight: '900',
        letterSpacing: -0.7,
    },

    headerSubtitle: {
        color: COLORS.mutedStrong,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
        fontWeight: '600',
    },

boxyLogoWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
},

boxyPulseGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(251, 0, 212, 0.38)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 12,
},

boxyAuraCore: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
},

    userAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.blackCard,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    userAvatarText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '900',
    },

    messagesScroll: {
        flex: 1,
    },

    messagesContent: {
        paddingTop: 8,
        paddingBottom: 18,
    },

    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 22,
    },

    botRow: {
        justifyContent: 'flex-start',
    },

    userRow: {
        justifyContent: 'flex-end',
    },

    messageContent: {
        maxWidth: '76%',
        paddingTop: 2,
    },

    botMessageContent: {
        alignItems: 'flex-start',
        marginLeft: 10,
    },

    userMessageContent: {
        alignItems: 'flex-end',
    },

    messageAuthor: {
        color: COLORS.muted,
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    botMessageText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 23,
    },

    userMessageText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '900',
        lineHeight: 23,
        textAlign: 'right',
    },

    thinkingText: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: '900',
        lineHeight: 23,
    },

    resultadoCardChat: {
        width: '100%',
        marginTop: 14,
        backgroundColor: COLORS.blackSoft,
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
    },

    resultadoTitulo: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 14,
    },

    resultadoHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },

    badgeConfianza: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },

    badgeConfianzaAlta: {
        color: COLORS.success,
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
    },

    badgeConfianzaMedia: {
        color: COLORS.accent,
        backgroundColor: COLORS.accentSoft,
    },

    badgeConfianzaBaja: {
        color: '#F87171',
        backgroundColor: 'rgba(248, 113, 113, 0.14)',
    },

    resultadoMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
    },

    metaItem: {
        backgroundColor: COLORS.blackCard,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexGrow: 1,
    },

    metaLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },

    metaValor: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },

    resultadoSeccionTitulo: {
        color: COLORS.muted,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginTop: 10,
        marginBottom: 6,
    },

    desgloseBox: {
        backgroundColor: COLORS.blackCard,
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    desgloseLinea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 4,
        gap: 10,
    },

    desgloseConcepto: {
        color: COLORS.mutedStrong,
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
        lineHeight: 17,
    },

    desgloseMonto: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '900',
    },

    desgloseDescuento: {
        color: COLORS.success,
        fontSize: 12,
        fontWeight: '900',
    },

    protocoloTexto: {
        color: COLORS.cyan,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 18,
    },

    advertenciaTexto: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 18,
    },

    validezTexto: {
        color: COLORS.muted,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
        marginBottom: 12,
    },

    resultadoLinea: {
        marginBottom: 11,
    },

    resultadoLabel: {
        color: COLORS.muted,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },

    resultadoValor: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '900',
    },

    resultadoPrecio: {
        color: COLORS.accent,
        fontSize: 25,
        fontWeight: '900',
        letterSpacing: -0.5,
    },

    resultadoExplicacion: {
        color: COLORS.offwhite,
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
        marginTop: 4,
    },

    resultadoSla: {
        color: COLORS.success,
        fontSize: 13,
        fontWeight: '900',
        lineHeight: 19,
        marginTop: 10,
        marginBottom: 13,
    },

    botonConfirmar: {
        backgroundColor: COLORS.success,
        minHeight: 48,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 14,
    },

    botonConfirmarTexto: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
    },

    composerShell: {
        backgroundColor: COLORS.blackSoft,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    },

    inputMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    inputLabel: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },

    optionalBadge: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: '900',
        backgroundColor: COLORS.accentSoft,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    textInput: {
        flex: 1,
        minHeight: 52,
        maxHeight: 52,
        backgroundColor: COLORS.black,
        borderRadius: 18,
        paddingHorizontal: 16,
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        marginRight: 10,
    },

    sendButton: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    sendButtonActive: {
        backgroundColor: COLORS.accent,
    },

    sendButtonDisabled: {
        backgroundColor: '#3A3A3A',
    },

    sendButtonText: {
        color: COLORS.black,
        fontSize: 24,
        fontWeight: '900',
        marginTop: -2,
    },

    skipButton: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 2,
    },

    skipButtonText: {
        color: COLORS.mutedStrong,
        fontSize: 13,
        fontWeight: '800',
        textDecorationLine: 'underline',
    },

    finalActions: {
        backgroundColor: COLORS.blackSoft,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    },

    restartButton: {
        minHeight: 50,
        borderRadius: 16,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    restartButtonText: {
        color: COLORS.black,
        fontSize: 15,
        fontWeight: '900',
    },

    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    columnaMedio: {
        width: '48%',
    },

    headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
},

backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.blackCard,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
},

backButtonText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: -2,
},
});