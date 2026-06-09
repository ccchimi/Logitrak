import { StyleSheet } from 'react-native';

export const COLORS = {
  black: '#0e0e0e',
  white: '#ffffff',
  accent: '#FFD700',
  muted: '#8a8880',
  border: 'rgba(255, 255, 255, 0.1)',
  borderDark: 'rgba(14, 14, 14, 0.1)',
};

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    backgroundColor: COLORS.white,
  },

  nav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 70,
    paddingHorizontal: 48,
    backgroundColor: 'rgba(14, 14, 14, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },

  logoDot: {
    color: COLORS.accent,
  },

  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  navLink: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 32,
  },

  navCta: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 4,
    marginLeft: 32,
  },

  navCtaText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '700',
  },

  hero: {
    justifyContent: 'center',
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },

  heroContent: {
    paddingHorizontal: 48,
    paddingTop: 70,
    zIndex: 2,
  },

  heroKicker: {
    color: COLORS.accent,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 20,
    textTransform: 'uppercase',
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 76,
    lineHeight: 76,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -2,
  },

  accentText: {
    color: COLORS.accent,
  },

  heroParagraph: {
    maxWidth: 500,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 40,
    fontSize: 18,
    lineHeight: 28,
  },

  heroButton: {
    backgroundColor: COLORS.black,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },

  heroButtonText: {
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.black,
  },

  statItem: {
    flex: 1,
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  borderRight: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  statNum: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 6,
  },

  statLabel: {
    color: COLORS.white,
    fontSize: 15,
  },

  features: {
    paddingVertical: 100,
    paddingHorizontal: 48,
    backgroundColor: COLORS.white,
  },

  sectionHead: {
    marginBottom: 48,
  },

  sectionKickerDark: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  sectionKickerLight: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  sectionTitleDark: {
    color: COLORS.black,
    fontSize: 40,
    fontWeight: '800',
    marginVertical: 20,
  },

  sectionTitleLight: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '800',
    marginTop: 10,
  },

  featuresGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.borderDark,
  },

  featCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },

  cardDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.borderDark,
  },

  cardMobileMargin: {
    marginBottom: 1,
  },

  featIcon: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.black,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  featIconText: {
    fontSize: 20,
  },

  featTitle: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 12,
  },

  featText: {
    color: COLORS.muted,
    lineHeight: 24,
    fontSize: 15,
  },

  how: {
    paddingVertical: 100,
    paddingHorizontal: 48,
    backgroundColor: COLORS.black,
  },

  steps: {
    flexDirection: 'row',
    marginTop: 60,
  },

  step: {
    flex: 1,
    marginRight: 40,
  },

  stepNum: {
    fontSize: 64,
    fontWeight: '800',
    color: 'rgba(255, 215, 0, 0.1)',
    lineHeight: 70,
    marginBottom: 16,
  },

  stepTitle: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
  },

  stepText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 22,
  },

  appSection: {
    paddingVertical: 100,
    paddingHorizontal: 48,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },

  appTextBlock: {
    flex: 1,
    paddingRight: 60,
  },

  appParagraph: {
    color: COLORS.muted,
    fontSize: 18,
    lineHeight: 28,
  },

  storeButtons: {
    flexDirection: 'row',
    marginTop: 32,
  },

  storeButton: {
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginRight: 12,
  },

  storeButtonText: {
    color: COLORS.black,
    fontSize: 15,
  },

  appVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  phoneMock: {
    width: 260,
    height: 500,
    backgroundColor: COLORS.black,
    borderRadius: 40,
    borderWidth: 12,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 40 },
    elevation: 10,
  },

  phoneScreen: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  phoneSpacer: {
    height: 10,
  },

  phoneBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },

  phoneBarAccent: {
    backgroundColor: COLORS.accent,
    width: '60%',
    marginBottom: 15,
  },

  phoneCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  phoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginRight: 10,
  },

  phoneDotMuted: {
    opacity: 0.3,
  },

  authPage: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },

  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },

  authCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: COLORS.white,
    padding: 48,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 40 },
    elevation: 12,
  },

  authTitle: {
    color: COLORS.black,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },

  authSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 32,
  },

  formGroup: {
    marginBottom: 20,
  },

  label: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    color: COLORS.black,
  },

  authButton: {
    width: '100%',
    padding: 16,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },

  authButtonText: {
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  authBottomText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: COLORS.black,
  },

  authLink: {
    fontWeight: '700',
    color: COLORS.black,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },

  footer: {
    paddingVertical: 60,
    paddingHorizontal: 48,
    backgroundColor: COLORS.black,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  footerLogo: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },

  footerText: {
    color: COLORS.white,
    opacity: 0.5,
    fontSize: 12,
  },

  pageTransition: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.black,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transitionLogo: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '800',
  },

  column: {
    flexDirection: 'column',
  },
});