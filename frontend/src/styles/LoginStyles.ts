import { DISENO } from "../theme/diseno";
import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

const CIRCLE_SIZE = Math.min(width * 1.45, 760);
const LOGIN_WIDTH = Math.min(width - 40, 450);

export const tamanosAuth = (anchoVentana: number) => ({
  circulo: Math.min(anchoVentana * 1.45, 760),
  caja: Math.min(anchoVentana - 40, 430),
});

export const COLORS = {
  black: DISENO.fondo,
  white: "#ffffff",
  accent: DISENO.amarillo,
  accentDark: DISENO.amarilloOscuro,
  muted: "#BEC2BA",
  border: "rgba(255, 255, 255, 0.1)",
  borderAccent: "rgba(255, 215, 0, 0.28)",
};

export const FONTS = {
  title: "Poppins_700Bold",
  titleBold: "Poppins_700Bold",
  text: "Poppins_400Regular",
  textMedium: "Poppins_500Medium",
  textLight: "DMSans_300Light",
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    overflow: "hidden",
  },

  circleArea: {
    position: "relative",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },

  circleContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  barWrapper: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
  },

  bar: {
    width: 8,
    height: 40,
    backgroundColor: "#2b2b2b",
    borderRadius: 8,
  },

  barActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  loginBox: {
    position: "relative",
    width: LOGIN_WIDTH,
    backgroundColor: DISENO.superficie,
    padding: 8,
    paddingTop: 64,
    paddingBottom: 45,
    borderWidth: 0,
  },

  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#484848",
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 20,
  },

  closeButtonText: {
    color: COLORS.muted,
    fontFamily: FONTS.textMedium,
    fontSize: 14,
    lineHeight: 16,
  },

  kicker: {
    color: COLORS.accent,
    fontFamily: FONTS.textMedium,
    fontSize: 12,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },

  titulo: {
    color: COLORS.white,
    fontFamily: FONTS.title,
    fontSize: 44,
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 8,
  },

  logoDot: {
    color: COLORS.accent,
  },

  subtitulo: {
    color: "#FFFFFF",
    fontFamily: FONTS.title,
    fontSize: 28,
    textAlign: "center",
    marginBottom: 16,
  },

  formGroup: {
    marginBottom: 10,
  },

  label: {
    color: COLORS.white,
    fontFamily: FONTS.textMedium,
    fontSize: 12,
    marginBottom: 8,
  },

  inputContainer: {
    position: "relative",
    width: "100%",
    height: 66,
    backgroundColor: "#39443D",
    borderWidth: 1,
    borderColor: "#68756B",
    borderRadius: 12,
    justifyContent: "center",
  },

  inputContainerFocused: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },

  input: {
    width: "100%",
    height: "100%",
    paddingLeft: 14,
    paddingRight: 46,
    color: COLORS.white,
    fontFamily: FONTS.text,
    fontSize: 16,
  },

  inputIcon: {
    position: "absolute",
    right: 14,
    top: 13,
    color: COLORS.accent,
    fontSize: 16,
  },

  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 24,
  },

  linkCrear: {
    color: COLORS.accent,
    fontFamily: FONTS.textMedium,
    fontSize: 13,
  },

  linkOlvido: {
    color: "#A8A59C",
    fontFamily: FONTS.text,
    fontSize: 13,
  },

  buttonShadow: {
    width: "100%",
    borderRadius: 12,
    shadowColor: COLORS.accent,
    shadowOpacity: 0,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 0,
  },

  loginButton: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  loginButtonText: {
    color: COLORS.black,
    fontFamily: FONTS.titleBold,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  hintBox: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  hintText: {
    color: COLORS.muted,
    fontFamily: FONTS.text,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  errorTexto: {
    color: "#ff6b6b",
    fontFamily: FONTS.textMedium,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },

  successTexto: {
    color: "#34d399",
    fontFamily: FONTS.textMedium,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },

  authScroll: {
    flexGrow: 1,
    paddingVertical: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  keyboardAvoiding: {
    flex: 1,
    width: "100%",
  },

  authStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  authCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    justifyContent: "center",
    alignItems: "center",
  },

  rolRow: {
    flexDirection: "row",
    gap: 10,
  },

  rolChip: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#484848",
    alignItems: "center",
    justifyContent: "center",
  },

  rolChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
  },

  rolChipText: {
    color: COLORS.muted,
    fontFamily: FONTS.textMedium,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  rolChipTextActive: {
    color: COLORS.accent,
  },

  vehiculoChip: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#484848",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    justifyContent: "center",
  },

  vehiculoChipText: {
    color: COLORS.muted,
    fontFamily: FONTS.textMedium,
    fontSize: 13,
    lineHeight: 18,
  },

  cuentaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 215, 0, 0.08)",
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  cuentaChipAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  cuentaChipAvatarText: {
    color: COLORS.black,
    fontFamily: FONTS.titleBold,
    fontSize: 13,
  },

  cuentaChipNombre: {
    color: COLORS.white,
    fontFamily: FONTS.textMedium,
    fontSize: 14,
  },

  cuentaChipUsuario: {
    color: COLORS.muted,
    fontFamily: FONTS.text,
    fontSize: 12,
    marginTop: 1,
  },

  linkCentrado: {
    marginTop: 22,
    alignItems: "center",
  },
});
