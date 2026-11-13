import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(() =>
    Platform.OS === "web"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : true,
  );
  useEffect(() => {
    let activo = true;
    if (Platform.OS === "web") {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      const actualizar = () => setReducido(query.matches);
      actualizar();
      query.addEventListener("change", actualizar);
      return () => query.removeEventListener("change", actualizar);
    }
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (activo) setReducido(v);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducido,
    );
    return () => {
      activo = false;
      subscription.remove();
    };
  }, []);
  return reducido;
}
