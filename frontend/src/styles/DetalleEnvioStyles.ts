import { StyleSheet } from 'react-native';
import { COLORS, FONTS } from './HomeStyles';

export { COLORS, FONTS };

export const ESTADO_ENVIO_COLOR: Record<string, string> = {
    pendiente: COLORS.amber,
    asignado: COLORS.cyan,
    en_viaje: COLORS.blue,
    entregado: COLORS.green,
    cancelado: COLORS.red,
};

export const ESTADO_PAGO_COLOR: Record<string, string> = {
    pendiente: COLORS.amber,
    aprobado: COLORS.green,
    rechazado: COLORS.red,
    cancelado: COLORS.muted,
    expirado: COLORS.muted,
    reembolsado: COLORS.cyan,
};

export const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 20, paddingBottom: 48, alignItems: 'center' },
    contenido: { width: '100%', maxWidth: 860 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    volver: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    volverTexto: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.titleBold },
    headerTextos: { flex: 1, minWidth: 0 },
    kicker: {
        color: COLORS.muted,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        fontFamily: FONTS.textMedium,
        marginBottom: 2,
    },
    codigo: { color: COLORS.white, fontSize: 22, fontFamily: FONTS.titleBold },

    tarjeta: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
        marginBottom: 16,
    },
    tarjetaTitulo: {
        color: COLORS.white,
        fontSize: 15,
        fontFamily: FONTS.titleBold,
        marginBottom: 14,
    },

    badgesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    badgePunto: { width: 7, height: 7, borderRadius: 999 },
    badgeTexto: { fontSize: 12.5, fontFamily: FONTS.titleBold },

    // Cada dato es una fila etiqueta/valor que envuelve en pantallas angostas.
    fila: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    filaPrimera: { borderTopWidth: 0, paddingTop: 0 },
    etiqueta: { color: COLORS.muted, fontSize: 12.5, fontFamily: FONTS.textMedium, minWidth: 110 },
    valor: {
        color: COLORS.white,
        fontSize: 14,
        fontFamily: FONTS.titleBold,
        flexShrink: 1,
        textAlign: 'right',
        flexGrow: 1,
    },
    valorLargo: { textAlign: 'left', width: '100%' },

    rutaCaja: {
        backgroundColor: COLORS.cardDeep,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 4,
    },
    rutaEtiqueta: { color: COLORS.muted, fontSize: 11.5, fontFamily: FONTS.textMedium, marginBottom: 3 },
    rutaValor: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.titleBold, marginBottom: 12 },

    pagoCaja: {
        backgroundColor: COLORS.cardDeep,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    pagoTop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    pagoMonto: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.titleBold },
    avisoReembolso: {
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.30)',
    },
    avisoReembolsoTexto: { color: '#FCA5A5', fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.text },

    evento: { flexDirection: 'row', gap: 12, paddingBottom: 14 },
    eventoLinea: { alignItems: 'center', width: 12 },
    eventoPunto: { width: 10, height: 10, borderRadius: 999, backgroundColor: COLORS.accent, marginTop: 4 },
    eventoBarra: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4 },
    eventoCuerpo: { flex: 1, minWidth: 0 },
    eventoTitulo: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
    eventoDetalle: { color: COLORS.muted, fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.text, marginTop: 2 },
    eventoFecha: { color: 'rgba(255,255,255,0.38)', fontSize: 11.5, fontFamily: FONTS.text, marginTop: 3 },

    zonaAdmin: { borderColor: 'rgba(239, 68, 68, 0.28)' },
    zonaAdminNota: { color: COLORS.muted, fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.text, marginBottom: 14 },
    accionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    boton: {
        flexGrow: 1,
        minWidth: 150,
        paddingVertical: 13,
        borderRadius: 13,
        alignItems: 'center',
        borderWidth: 1,
    },
    botonNeutro: { backgroundColor: COLORS.card, borderColor: COLORS.borderStrong },
    botonNeutroTexto: { color: COLORS.white, fontSize: 13.5, fontFamily: FONTS.titleBold },
    botonPeligro: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
    botonPeligroTexto: { color: '#FCA5A5', fontSize: 13.5, fontFamily: FONTS.titleBold },
    botonDeshabilitado: { opacity: 0.45 },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    vacio: { color: COLORS.muted, fontSize: 13.5, fontFamily: FONTS.text, textAlign: 'center', lineHeight: 20 },
});
