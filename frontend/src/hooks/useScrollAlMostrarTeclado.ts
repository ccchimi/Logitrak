import { RefObject, useEffect } from "react";
import { Keyboard, Platform, ScrollView } from "react-native";

export function useScrollAlMostrarTeclado(scroll: RefObject<ScrollView | null>) {
  useEffect(() => {
    const evento = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(evento, () =>
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })),
    );
    return () => sub.remove();
  }, [scroll]);
}
