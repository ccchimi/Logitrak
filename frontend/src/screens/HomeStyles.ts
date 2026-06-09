import { StyleSheet } from 'react-native';

// Paleta del panel (navy + dorado), consistente con la TarjetaViaje.
export const COLORS = {
  bg: '#0A111E',
  sidebar: '#0E1626',
  surface: '#101827',
  surfaceAlt: '#13203A',
  surfaceDeep: '#0A1322',
  border: '#1F2A44',
  borderSoft: '#27344F',
  accent: '#FFD83D',
  ink: '#111111',
  white: '#FFFFFF',
  textSoft: '#AEBBD2',
  textMuted: '#6E7C99',
  blue: '#3B82F6',
  amber: '#F59E0B',
  green: '#10B981',
};

export const ESTADO_COLORS = {
  accent: COLORS.accent,
  blue: COLORS.blue,
  amber: COLORS.amber,
  green: COLORS.green,
};

export const FONTS = {
  title: 'DMSans_700Bold',
  titleBold: 'DMSans_700Bold',
  text: 'DMSans_400Regular',
  textMedium: 'DMSans_500Medium',
  textLight: 'DMSans_300Light',
};

export const styles = StyleSheet.create({
  // ===== SHELL =====
  screen: { flex: 1, backgroundColor: COLORS.bg },
  screenRow: { flexDirection: 'row' },
  main: { flex: 1 },

  listContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // ScrollView centrado.
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // Grilla de tarjetas: varias por fila, baja al llenarse.
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    width: '100%',
  },
  cell: {},

  // Bloque centrado con ancho máximo (evita el "stretch").
  block: { width: '100%', maxWidth: 1180 },

  // ===== SIDEBAR (escritorio) =====
  sidebar: {
    width: 264,
    backgroundColor: COLORS.sidebar,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  sbBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 36,
  },

  sbLogo: { color: COLORS.white, fontSize: 23, fontFamily: FONTS.title, letterSpacing: -0.5 },
  sbDot: { color: COLORS.accent },

  sbNavLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    marginBottom: 10,
    fontFamily: FONTS.textMedium,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },

  navItemActive: { backgroundColor: COLORS.surfaceAlt },

  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel: { color: COLORS.textSoft, fontSize: 14, fontFamily: FONTS.textMedium },
  navLabelActive: { color: COLORS.white, fontFamily: FONTS.titleBold },

  sbSpacer: { flex: 1 },

  sbUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  sbAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sbAvatarText: { color: COLORS.ink, fontSize: 15, fontFamily: FONTS.title },
  sbUserName: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
  sbUserMail: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.text, marginTop: 1 },

  sbSalir: {
    borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  sbSalirText: { color: COLORS.textSoft, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== TOPBAR MÓVIL =====
  mTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  mBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mLogo: { color: COLORS.white, fontSize: 22, fontFamily: FONTS.title },
  mDot: { color: COLORS.accent },
  mRolePill: { backgroundColor: COLORS.accent, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  mRolePillText: { color: COLORS.ink, fontSize: 10, letterSpacing: 1, fontFamily: FONTS.titleBold },
  mSalir: { backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  mSalirText: { color: COLORS.ink, fontSize: 13, fontFamily: FONTS.titleBold },
  mNavRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  mChip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderSoft,
    borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8,
  },
  mChipText: { color: COLORS.textSoft, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== PAGE HEAD =====
  pageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  eyebrow: {
    color: COLORS.accent, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: 8, fontFamily: FONTS.textMedium,
  },
  greeting: { color: COLORS.white, fontSize: 30, letterSpacing: -1, fontFamily: FONTS.title, marginBottom: 6 },
  dateText: { color: COLORS.textSoft, fontSize: 14, fontFamily: FONTS.text },

  pageHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  statusText: { color: COLORS.white, fontSize: 12, fontFamily: FONTS.textMedium },
  ctaSmall: {
    backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12,
  },
  ctaSmallText: { color: COLORS.ink, fontSize: 13, fontFamily: FONTS.titleBold },

  // ===== KPIs =====
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  kpiCard: {
    flexGrow: 1, flexBasis: 180, minWidth: 160,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18,
  },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiLabel: { color: COLORS.textSoft, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONTS.textMedium },
  kpiDot: { width: 9, height: 9, borderRadius: 5 },
  kpiValue: { color: COLORS.white, fontSize: 40, letterSpacing: -0.5, fontFamily: FONTS.title, marginBottom: 2 },
  kpiSub: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.text, marginBottom: 16 },
  kpiBarTrack: { height: 4, borderRadius: 999, backgroundColor: COLORS.surfaceDeep, overflow: 'hidden' },
  kpiBarFill: { height: 4, borderRadius: 999 },

  // ===== PANELES (dos columnas) =====
  twoCol: { flexDirection: 'row', gap: 14, marginBottom: 22 },
  panel: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 22, paddingVertical: 20,
  },
  panelHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  panelTitle: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.titleBold, marginBottom: 4 },
  panelSub: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, fontFamily: FONTS.text },
  panelPct: { color: COLORS.accent, fontSize: 32, letterSpacing: -1, fontFamily: FONTS.title },

  progressTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.surfaceDeep, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: COLORS.accent },

  distRow: { marginBottom: 16 },
  distLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  distLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distDot: { width: 9, height: 9, borderRadius: 5 },
  distName: { color: COLORS.textSoft, fontSize: 13, fontFamily: FONTS.textMedium },
  distCount: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
  distBarTrack: { height: 6, borderRadius: 999, backgroundColor: COLORS.surfaceDeep, overflow: 'hidden' },
  distBarFill: { height: 6, borderRadius: 999 },

  // ===== FILTROS =====
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderSoft,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.textSoft, fontSize: 13, fontFamily: FONTS.textMedium },
  chipTextActive: { color: COLORS.ink },
  chipCount: { color: COLORS.textMuted, fontFamily: FONTS.titleBold },
  chipCountActive: { color: COLORS.ink },

  // ===== SECCIÓN =====
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontSize: 19, fontFamily: FONTS.titleBold, marginBottom: 3 },
  sectionSub: { color: COLORS.textSoft, fontSize: 13, fontFamily: FONTS.text },
  linkText: { color: COLORS.accent, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== EMPTY STATE =====
  emptyWrap: {
    width: '100%', maxWidth: 1180,
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontFamily: FONTS.titleBold, marginBottom: 6 },
  emptyText: {
    color: COLORS.textSoft, fontSize: 13, lineHeight: 20, textAlign: 'center',
    fontFamily: FONTS.text, maxWidth: 320,
  },
});
