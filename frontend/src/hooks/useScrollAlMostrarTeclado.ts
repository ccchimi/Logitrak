import { RefObject, useEffect } from "react";
import { Keyboard, Platform } from "react-native";
import type { RefScrollView } from "../types/refs";

export function useScrollAlMostrarTeclado(scroll: RefObject<RefScrollView | null>) {
  useEffect(() => {
    const evento = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(evento, () =>
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })),
    );
    return () => sub.remove();
  }, [scroll]);
}
