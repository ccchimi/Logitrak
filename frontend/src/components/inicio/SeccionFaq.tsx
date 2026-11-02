import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { faqs } from '../../constants/contenidoInicio';

export default function SeccionFaq({ isMobile }: { isMobile: boolean }) {
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAbierta((prev) => (prev === index ? null : index));
  };

  return (
    <View style={[styles.faq, isMobile && styles.sectionM]}>
      <View style={styles.inner}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionKickerDark}>Preguntas frecuentes</Text>
          <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
            Lo que solés querer saber
          </Text>
        </View>

        <View style={styles.faqList}>
          {faqs.map((item, index) => (
            <View key={item.q} style={styles.faqItem}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.faqQuestionRow}
                onPress={() => toggleFaq(index)}
              >
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Text style={styles.faqToggle}>
                  {faqAbierta === index ? '−' : '+'}
                </Text>
              </TouchableOpacity>

              {faqAbierta === index && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
