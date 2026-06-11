import { StyleSheet } from 'react-native';

export const COLORS = {
  black: '#0e0e0e',
  ink: '#161616',
  white: '#ffffff',
  offwhite: '#fafafa',
  accent: '#FFD700',
  accentSoft: 'rgba(255, 215, 0, 0.12)',
  muted: '#8a8880',
  mutedLight: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderDark: 'rgba(14, 14, 14, 0.1)',
};

export const FONTS = {
  title: 'DMSans_700Bold',
  titleBold: 'DMSans_700Bold',
  titleReg: 'DMSans_500Medium',
  text: 'DMSans_400Regular',
  textMedium: 'DMSans_500Medium',
  textLight: 'DMSans_300Light',
};

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flex: 1 },
  scrollContent: { backgroundColor: COLORS.white },

  nav: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, height: 70,
    paddingHorizontal: 48, backgroundColor: 'rgba(14, 14, 14, 0.95)',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: { fontSize: 24, color: COLORS.white, fontFamily: FONTS.title, letterSpacing: -0.5 },
  logoDot: { color: COLORS.accent },
  navLinks: { flexDirection: 'row', alignItems: 'center' },
  navLink: { color: '#ccc', fontSize: 14, marginLeft: 28, fontFamily: FONTS.textMedium },
  navCta: {
    backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 22,
    borderRadius: 4, marginLeft: 28, borderWidth: 1, borderColor: COLORS.accent,
  },
  navCtaHover: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
    transform: [{ scale: 1.04 }],
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navCtaText: { color: COLORS.black, fontSize: 14, fontFamily: FONTS.titleBold },
  navCtaTextHover: { color: COLORS.black },

  hero: { justifyContent: 'center' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  heroContent: { paddingHorizontal: 48, paddingTop: 70, zIndex: 2 },
  heroKicker: {
    color: COLORS.accent, letterSpacing: 2, marginBottom: 20,
    textTransform: 'uppercase', fontFamily: FONTS.textMedium, fontSize: 13,
  },
  heroTitle: {
    color: COLORS.white, fontSize: 62, lineHeight: 66, marginBottom: 20,
    letterSpacing: -1, fontFamily: FONTS.title,
  },
  accentText: { color: COLORS.accent },
  heroParagraph: {
    maxWidth: 500, color: COLORS.white, opacity: 0.8, marginBottom: 40,
    fontSize: 18, lineHeight: 28, fontFamily: FONTS.text,
  },
  heroButton: {
    backgroundColor: COLORS.black, paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: 4, alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: COLORS.accent, textTransform: 'uppercase', fontFamily: FONTS.titleBold,
    fontSize: 14, letterSpacing: 1,
  },

  statsBar: { flexDirection: 'row', width: '100%', maxWidth: 1180, alignSelf: 'center' },
  statItem: { flex: 1, paddingVertical: 60, paddingHorizontal: 40 },
  borderRight: { borderRightWidth: 1, borderRightColor: COLORS.border },
  statNum: { fontSize: 48, color: COLORS.accent, marginBottom: 6, fontFamily: FONTS.title },
  statLabel: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.text },

  trustedStrip: {
    backgroundColor: COLORS.black, paddingVertical: 38, paddingHorizontal: 48,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  trustedLabel: {
    color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
    textAlign: 'center', marginBottom: 24, fontFamily: FONTS.textMedium,
  },
  trustedRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
  },
  trustedItem: {
    color: 'rgba(255,255,255,0.5)', fontSize: 22, marginHorizontal: 22, marginVertical: 8,
    letterSpacing: -0.5, fontFamily: FONTS.title,
  },

  features: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.white },
  sectionHead: { marginBottom: 48 },
  sectionKickerDark: {
    color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, fontFamily: FONTS.textMedium,
  },
  sectionKickerLight: {
    color: COLORS.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, fontFamily: FONTS.textMedium,
  },
  sectionTitleDark: {
    color: COLORS.black, fontSize: 40, marginVertical: 16, fontFamily: FONTS.title,
    letterSpacing: -1, maxWidth: 620,
  },
  sectionTitleLight: {
    color: COLORS.white, fontSize: 40, marginTop: 10, fontFamily: FONTS.title,
    letterSpacing: -1, maxWidth: 620,
  },
  sectionIntro: {
    color: COLORS.muted, fontSize: 17, lineHeight: 26, maxWidth: 560,
    fontFamily: FONTS.text, marginTop: 4,
  },

  featuresGrid: {
    flexDirection: 'row', borderWidth: 1, borderColor: COLORS.borderDark,
    borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.borderDark,
  },
  featCard: { flex: 1, backgroundColor: COLORS.white, paddingVertical: 48, paddingHorizontal: 32 },
  cardDivider: { borderRightWidth: 1, borderRightColor: COLORS.borderDark },
  cardMobileMargin: { marginBottom: 1 },
  featIcon: {
    width: 44, height: 44, backgroundColor: COLORS.black, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  featIconText: { fontSize: 20 },
  featTitle: { color: COLORS.black, fontSize: 20, marginBottom: 12, fontFamily: FONTS.titleBold },
  featText: { color: COLORS.muted, lineHeight: 24, fontSize: 15, fontFamily: FONTS.text },

  solutions: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.offwhite },
  solGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 40, gap: 20 },
  solCard: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderDark,
    borderRadius: 16, padding: 28,
  },
  solIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.black,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  solIconText: { fontSize: 22 },
  solTitle: { color: COLORS.black, fontSize: 19, marginBottom: 10, fontFamily: FONTS.titleBold },
  solText: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginBottom: 16, fontFamily: FONTS.text },
  solLink: { color: COLORS.black, fontSize: 13, fontFamily: FONTS.textMedium },

  how: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.black },
  steps: { flexDirection: 'row', marginTop: 60 },
  step: { flex: 1, marginRight: 40 },
  stepNum: {
    fontSize: 64, color: 'rgba(255, 215, 0, 0.15)', lineHeight: 70,
    marginBottom: 16, fontFamily: FONTS.title,
  },
  stepTitle: { color: COLORS.white, fontSize: 18, marginBottom: 10, fontFamily: FONTS.titleBold },
  stepText: { color: COLORS.white, fontSize: 14, opacity: 0.6, lineHeight: 22, fontFamily: FONTS.text },

  coverage: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.black, borderTopWidth: 1, borderTopColor: COLORS.border },
  coverageInner: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  coverageLeft: { flex: 1 },
  coverageRight: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  coverageParagraph: { color: COLORS.mutedLight, fontSize: 17, lineHeight: 27, marginTop: 14, marginBottom: 30, fontFamily: FONTS.text },
  coverageStatsRow: { flexDirection: 'row', gap: 40 },
  coverageStatNum: { color: COLORS.accent, fontSize: 38, fontFamily: FONTS.title },
  coverageStatLabel: { color: COLORS.white, fontSize: 13, opacity: 0.7, marginTop: 4, fontFamily: FONTS.text },
  cityChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cityChipText: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.textMedium },

  tracking: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.white },
  trackingInner: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  trackingTextBlock: { flex: 1 },
  trackingParagraph: { color: COLORS.muted, fontSize: 17, lineHeight: 27, marginTop: 14, fontFamily: FONTS.text },
  trackCard: {
    flex: 1, backgroundColor: COLORS.black, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: COLORS.border,
  },
  trackHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  trackCode: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.titleBold },
  trackBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentSoft,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
  },
  trackBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 7 },
  trackBadgeText: { color: COLORS.accent, fontSize: 12, fontFamily: FONTS.textMedium },
  trackRow: { flexDirection: 'row', alignItems: 'flex-start' },
  trackTimeline: { alignItems: 'center', marginRight: 16 },
  trackDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#333', backgroundColor: COLORS.black },
  trackDotActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  trackLineSeg: { width: 2, height: 30, backgroundColor: '#333' },
  trackLineSegActive: { backgroundColor: COLORS.accent },
  trackInfo: { paddingBottom: 14 },
  trackLabel: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.textMedium },
  trackLabelMuted: { color: 'rgba(255,255,255,0.4)' },
  trackTime: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONTS.text },

  testimonials: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.offwhite },
  testiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 40 },
  testiCard: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderDark,
    borderRadius: 16, padding: 28,
  },
  testiStars: { color: COLORS.accent, fontSize: 15, marginBottom: 14, letterSpacing: 2 },
  testiQuote: { color: COLORS.black, fontSize: 15, lineHeight: 24, marginBottom: 22, fontFamily: FONTS.text },
  testiAuthorRow: { flexDirection: 'row', alignItems: 'center' },
  testiAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.black,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  testiAvatarText: { color: COLORS.accent, fontSize: 15, fontFamily: FONTS.titleBold },
  testiAuthor: { color: COLORS.black, fontSize: 14, fontFamily: FONTS.titleBold },
  testiRole: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONTS.text },

  plans: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.black },
  plansHead: { alignItems: 'center', marginBottom: 8 },
  plansGrid: { flexDirection: 'row', gap: 20, marginTop: 44, alignItems: 'stretch' },
  planCard: {
    flex: 1, backgroundColor: COLORS.ink, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 32,
  },
  planCardFeatured: { borderColor: COLORS.accent, backgroundColor: '#1a1606' },
  planBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.accent, paddingVertical: 5,
    paddingHorizontal: 12, borderRadius: 999, marginBottom: 16,
  },
  planBadgeText: { color: COLORS.black, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONTS.titleBold },
  planName: { color: COLORS.white, fontSize: 20, marginBottom: 8, fontFamily: FONTS.titleBold },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  planPrice: { color: COLORS.white, fontSize: 44, letterSpacing: -1, fontFamily: FONTS.title },
  planPriceUnit: { color: COLORS.muted, fontSize: 14, marginBottom: 10, marginLeft: 6, fontFamily: FONTS.text },
  planDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },
  planItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  planCheck: { color: COLORS.accent, fontSize: 14, marginRight: 10, fontFamily: FONTS.titleBold },
  planItemText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, flex: 1, lineHeight: 20, fontFamily: FONTS.text },
  planBtn: {
    marginTop: 24, paddingVertical: 14, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  planBtnText: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.titleBold },
  planBtnFeatured: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  planBtnTextFeatured: { color: COLORS.black },

  appSection: {
    paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.offwhite,
    borderTopWidth: 1, borderTopColor: COLORS.borderDark,
  },
  appRow: { flexDirection: 'row', alignItems: 'center' },
  appTextBlock: { flex: 1, paddingRight: 60 },
  appParagraph: { color: COLORS.muted, fontSize: 18, lineHeight: 28, fontFamily: FONTS.text },
  storeButtons: { flexDirection: 'row', marginTop: 32 },
  storeButton: {
    borderWidth: 1, borderColor: COLORS.borderDark, paddingVertical: 12,
    paddingHorizontal: 20, borderRadius: 10, marginRight: 12,
  },
  storeButtonText: { color: COLORS.black, fontSize: 15, fontFamily: FONTS.textMedium },
  appVisual: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phoneMock: {
    width: 260, height: 500, backgroundColor: COLORS.black, borderRadius: 40,
    borderWidth: 12, borderColor: '#1a1a1a', overflow: 'hidden', shadowColor: '#000',
    shadowOpacity: 0.1, shadowRadius: 40, shadowOffset: { width: 0, height: 40 }, elevation: 10,
  },
  phoneScreen: { paddingVertical: 30, paddingHorizontal: 20 },
  phoneSpacer: { height: 10 },
  phoneBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  phoneBarAccent: { backgroundColor: COLORS.accent, width: '60%', marginBottom: 15 },
  phoneCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 15,
  },
  phoneDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent, marginRight: 10 },
  phoneDotMuted: { opacity: 0.3 },

  faq: { paddingVertical: 100, paddingHorizontal: 48, backgroundColor: COLORS.white },
  faqList: { marginTop: 36, maxWidth: 820, alignSelf: 'center', width: '100%' },
  faqItem: { borderBottomWidth: 1, borderBottomColor: COLORS.borderDark },
  faqQuestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 22,
  },
  faqQuestion: { color: COLORS.black, fontSize: 17, flex: 1, paddingRight: 20, fontFamily: FONTS.titleBold },
  faqToggle: { color: COLORS.accent, fontSize: 24, fontFamily: FONTS.title, lineHeight: 26 },
  faqAnswer: { color: COLORS.muted, fontSize: 15, lineHeight: 24, paddingBottom: 24, paddingRight: 40, fontFamily: FONTS.text },

  ctaBand: { paddingVertical: 90, paddingHorizontal: 48, backgroundColor: COLORS.accent, alignItems: 'center' },
  ctaTitle: { color: COLORS.black, fontSize: 46, textAlign: 'center', letterSpacing: -1, marginBottom: 16, fontFamily: FONTS.title, maxWidth: 700 },
  ctaText: { color: 'rgba(0,0,0,0.7)', fontSize: 18, textAlign: 'center', marginBottom: 32, maxWidth: 560, fontFamily: FONTS.text, lineHeight: 27 },
  ctaButton: { backgroundColor: COLORS.black, paddingVertical: 16, paddingHorizontal: 44, borderRadius: 6 },
  ctaButtonText: { color: COLORS.accent, fontSize: 15, textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONTS.titleBold },

  footerTop: {
    paddingHorizontal: 48, paddingTop: 70, paddingBottom: 40, backgroundColor: COLORS.black,
  },
  footerBrandCol: { maxWidth: 280 },
  footerTagline: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 22, marginTop: 16, fontFamily: FONTS.text },
  footerCol: {},
  footerColTitle: { color: COLORS.white, fontSize: 14, marginBottom: 16, fontFamily: FONTS.titleBold },
  footerColLink: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 12, fontFamily: FONTS.text },
  footerBottom: {
    paddingHorizontal: 48, paddingVertical: 26, backgroundColor: COLORS.black,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerLogo: { color: COLORS.white, fontSize: 24, fontFamily: FONTS.title },
  footerText: { color: COLORS.white, opacity: 0.5, fontSize: 12, fontFamily: FONTS.text },

  column: { flexDirection: 'column' },

  // ===== MOBILE OVERRIDES =====
  // El nav fijo recibe height/paddingTop dinámicos (safe area) desde Inicio.tsx.
  navM: { paddingHorizontal: 20 },

  menuBtn: {
    width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border,
  },
  menuBtnText: { color: COLORS.white, fontSize: 18, lineHeight: 22 },

  menuPanel: {
    position: 'absolute', left: 0, right: 0, zIndex: 99,
    backgroundColor: 'rgba(14, 14, 14, 0.98)',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20,
  },
  menuLink: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLinkText: { color: '#e8e8e8', fontSize: 16, fontFamily: FONTS.textMedium },
  menuCta: {
    marginTop: 18, backgroundColor: COLORS.accent, borderRadius: 6,
    paddingVertical: 14, alignItems: 'center',
  },
  menuCtaText: { color: COLORS.black, fontSize: 14, fontFamily: FONTS.titleBold },

  heroContentM: { paddingHorizontal: 20, paddingBottom: 32 },
  heroTitleM: { fontSize: 42, lineHeight: 46 },
  heroParagraphM: { fontSize: 16, lineHeight: 25, marginBottom: 32 },
  heroButtonM: { alignSelf: 'stretch', alignItems: 'center' },

  statItemM: {
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%',
    paddingVertical: 24, paddingHorizontal: 24, alignItems: 'center',
  },
  statDividerM: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statNumM: { fontSize: 36 },

  trustedItemM: { fontSize: 17, marginHorizontal: 14, marginVertical: 6 },

  sectionM: { paddingVertical: 64, paddingHorizontal: 20 },
  sectionTitleM: { fontSize: 30, lineHeight: 36 },

  fullWidthM: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  stackGapM: { gap: 32 },

  stepM: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', marginRight: 0, marginBottom: 34 },
  stepNumM: { fontSize: 48, lineHeight: 54, marginBottom: 10 },

  coverageStatsRowM: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },

  appTextBlockM: {
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%',
    paddingRight: 0, marginBottom: 44,
  },
  appVisualM: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },

  ctaBandM: { paddingVertical: 64, paddingHorizontal: 20 },
  ctaTitleM: { fontSize: 30, lineHeight: 36 },

  footerPadM: { paddingHorizontal: 20 },

  inner: { width: '100%', maxWidth: 1180, alignSelf: 'center' },

  statsBand: { backgroundColor: COLORS.black },
  footerInner: {
    width: '100%', maxWidth: 1180, alignSelf: 'center',
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 30,
  },
  footerBottomInner: {
    width: '100%', maxWidth: 1180, alignSelf: 'center',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 12,
  },
});
