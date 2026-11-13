import { useTema } from "../../hooks/useTema";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/InicioStyles";
import Transicion from "../Transicion";
import { faqs } from "../../constants/contenidoInicio";

export default function SeccionFaq({ isMobile }: { isMobile: boolean }) {
  const tema = useTema();
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAbierta((prev) => (prev === index ? null : index));
  };

  return (
    <View style={tema.estilo([styles.faq, isMobile && styles.sectionM])}>
      <View style={tema.estilo(styles.inner)}>
        <View style={tema.estilo(styles.sectionHead)}>
          <Text style={tema.estilo(styles.sectionKickerDark)}>Preguntas frecuentes</Text>
          <Text
            style={tema.estilo([styles.sectionTitleDark, isMobile && styles.sectionTitleM])}
          >
            Lo que solés querer saber
          </Text>
        </View>

        <View style={tema.estilo(styles.faqList)}>
          {faqs.map((item, index) => (
            <View key={item.q} style={tema.estilo(styles.faqItem)}>
              <TouchableOpacity
                accessibilityRole="button"
                aria-expanded={faqAbierta === index}
                accessibilityState={{ expanded: faqAbierta === index }}
                activeOpacity={0.7}
                style={tema.estilo(styles.faqQuestionRow)}
                onPress={() => toggleFaq(index)}
              >
                <Text style={tema.estilo(styles.faqQuestion)}>{item.q}</Text>
                <Text style={tema.estilo(styles.faqToggle)}>
                  {faqAbierta === index ? "−" : "+"}
                </Text>
              </TouchableOpacity>

              {faqAbierta === index && (
                <Transicion cambio={index}>
                  <Text style={tema.estilo(styles.faqAnswer)}>{item.a}</Text>
                </Transicion>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
