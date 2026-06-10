import { Platform, StyleSheet } from 'react-native';

// Paleta corporativa: negro profundo + dorado, alineada con Login,
// Inicio y la pantalla de Boxy (SolicitudEnvio).
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
  blue: '#3B82F6',
  amber: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',
  cyan: '#22D3EE',
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
  // ===== SHELL =====
  screen: { flex: 1, backgroundColor: COLORS.bg },
  screenRow: { flexDirection: 'row' },
  main: { flex: 1 },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    width: '100%',
  },
  cell: {},

  block: { width: '100%', maxWidth: 1180 },

  // ===== SIDEBAR (escritorio) =====
  sidebar: {
    width: 268,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  sbBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },

  sbLogo: { color: COLORS.white, fontSize: 24, fontFamily: FONTS.title, letterSpacing: -0.5 },
  sbDot: { color: COLORS.accent },

  sbTag: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: FONTS.textMedium,
    paddingHorizontal: 10,
    marginBottom: 34,
  },

  sbNavLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    marginBottom: 10,
    fontFamily: FONTS.textMedium,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  navItemActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.borderAccent,
  },

  navIcon: { fontSize: 15, width: 22, textAlign: 'center', color: COLORS.muted },
  navIconActive: { color: COLORS.accent },
  navLabel: { color: COLORS.mutedStrong, fontSize: 14, fontFamily: FONTS.textMedium },
  navLabelActive: { color: COLORS.white, fontFamily: FONTS.titleBold },

  sbBoxyCard: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    backgroundColor: COLORS.card,
    padding: 16,
  },

  sbBoxyKicker: {
    color: COLORS.accent,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: FONTS.textMedium,
    marginBottom: 6,
  },

  sbBoxyText: {
    color: COLORS.mutedStrong,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONTS.text,
    marginBottom: 12,
  },

  sbBoxyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },

  sbBoxyBtnText: { color: COLORS.ink, fontSize: 12, fontFamily: FONTS.titleBold },

  sbSpacer: { flex: 1 },

  sbUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  sbAvatar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sbAvatarText: { color: COLORS.ink, fontSize: 15, fontFamily: FONTS.title },
  sbUserName: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
  sbUserMail: { color: COLORS.muted, fontSize: 11, fontFamily: FONTS.text, marginTop: 1 },

  sbSalir: {
    borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  sbSalirText: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.textMedium },

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
  mRolePill: {
    backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.borderAccent,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6,
  },
  mRolePillText: { color: COLORS.accent, fontSize: 10, letterSpacing: 1, fontFamily: FONTS.titleBold },
  mSalir: {
    borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
  },
  mSalirText: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.titleBold },
  mNavRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  mChip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong,
    borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8,
  },
  mChipText: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== HERO =====
  hero: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    padding: 26,
    marginBottom: 18,
    overflow: 'hidden',
    ...cardShadow,
  },

  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 18,
  },

  eyebrow: {
    color: COLORS.accent, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: 10, fontFamily: FONTS.textMedium,
  },
  greeting: { color: COLORS.white, fontSize: 32, letterSpacing: -1, fontFamily: FONTS.title, marginBottom: 6 },
  dateText: { color: COLORS.muted, fontSize: 14, fontFamily: FONTS.text },

  heroRight: { alignItems: 'flex-end', gap: 12 },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  statusText: { color: COLORS.green, fontSize: 12, fontFamily: FONTS.titleBold },

  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },

  ctaPrimary: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  ctaPrimaryInner: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaPrimaryText: { color: COLORS.ink, fontSize: 13, fontFamily: FONTS.titleBold, letterSpacing: 0.4 },

  ctaGhost: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaGhostText: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== KPIs =====
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  kpiCard: {
    flexGrow: 1, flexBasis: 180, minWidth: 160,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18,
    ...cardShadow,
  },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiLabel: {
    color: COLORS.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
    fontFamily: FONTS.textMedium,
  },
  kpiIconChip: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiIconText: { fontSize: 13 },
  kpiValue: { color: COLORS.white, fontSize: 42, letterSpacing: -1, fontFamily: FONTS.title, marginBottom: 2 },
  kpiSub: { color: COLORS.muted, fontSize: 12, fontFamily: FONTS.text, marginBottom: 16 },
  kpiBarTrack: { height: 5, borderRadius: 999, backgroundColor: COLORS.cardDeep, overflow: 'hidden' },
  kpiBarFill: { height: 5, borderRadius: 999 },

  // ===== PANELES =====
  twoCol: { flexDirection: 'row', gap: 14, marginBottom: 22 },
  panel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 22,
    paddingHorizontal: 22, paddingVertical: 20,
    ...cardShadow,
  },
  panelHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  panelTitle: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.titleBold, marginBottom: 4 },
  panelSub: { color: COLORS.muted, fontSize: 13, lineHeight: 19, fontFamily: FONTS.text },
  panelPct: { color: COLORS.accent, fontSize: 34, letterSpacing: -1, fontFamily: FONTS.title },

  progressTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.cardDeep, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: COLORS.accent },

  panelFootNote: {
    color: COLORS.muted, fontSize: 12, fontFamily: FONTS.text, marginTop: 14, lineHeight: 17,
  },

  distRow: { marginBottom: 16 },
  distLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  distLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distDot: { width: 9, height: 9, borderRadius: 5 },
  distName: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.textMedium },
  distCount: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
  distBarTrack: { height: 6, borderRadius: 999, backgroundColor: COLORS.cardDeep, overflow: 'hidden' },
  distBarFill: { height: 6, borderRadius: 999 },

  // ===== ACCESOS RÁPIDOS =====
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 22 },
  quickCard: {
    flexGrow: 1, flexBasis: 200, minWidth: 170,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    padding: 18,
  },
  quickIconChip: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  quickIcon: { fontSize: 17 },
  quickTitle: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.titleBold, marginBottom: 4 },
  quickSub: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontFamily: FONTS.text },
  quickArrow: { color: COLORS.accent, fontSize: 14, fontFamily: FONTS.titleBold, marginTop: 12 },

  // ===== FILTROS =====
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.mutedStrong, fontSize: 13, fontFamily: FONTS.textMedium },
  chipTextActive: { color: COLORS.ink },
  chipCount: { color: COLORS.muted, fontFamily: FONTS.titleBold },
  chipCountActive: { color: COLORS.ink },

  // ===== SECCIÓN =====
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontSize: 19, fontFamily: FONTS.titleBold, marginBottom: 3 },
  sectionSub: { color: COLORS.muted, fontSize: 13, fontFamily: FONTS.text },
  linkText: { color: COLORS.accent, fontSize: 13, fontFamily: FONTS.textMedium },

  // ===== EMPTY STATE =====
  emptyWrap: {
    width: '100%', maxWidth: 1180,
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong,
    borderRadius: 20, borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontFamily: FONTS.titleBold, marginBottom: 6 },
  emptyText: {
    color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center',
    fontFamily: FONTS.text, maxWidth: 320,
  },
});
