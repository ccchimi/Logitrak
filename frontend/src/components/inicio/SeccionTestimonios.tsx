import React from 'react';
import { Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { testimonials } from '../../constants/contenidoInicio';

export default function SeccionTestimonios({ isMobile, solWidth }: { isMobile: boolean; solWidth: DimensionValue }) {
  return (
    <View style={[styles.testimonials, isMobile && styles.sectionM]}>
      <View style={styles.inner}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionKickerDark}>Testimonios</Text>
          <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
            Quienes ya mueven con nosotros
          </Text>
        </View>

        <View style={styles.testiGrid}>
          {testimonials.map((item) => (
            <View key={item.author} style={[styles.testiCard, { width: solWidth }]}>
              <Text style={styles.testiStars}>★★★★★</Text>
              <Text style={styles.testiQuote}>“{item.quote}”</Text>

              <View style={styles.testiAuthorRow}>
                <View style={styles.testiAvatar}>
                  <Text style={styles.testiAvatarText}>{item.initials}</Text>
                </View>
                <View>
                  <Text style={styles.testiAuthor}>{item.author}</Text>
                  <Text style={styles.testiRole}>{item.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
