import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { testimonials } from '../../constants/contenidoInicio';

export default function SeccionTestimonios({ isMobile, solWidth }: { isMobile: boolean; solWidth: DimensionValue }) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.testimonials, isMobile && styles.sectionM])}>
      <View style={tema.estilo(styles.inner)}>
        <View style={tema.estilo(styles.sectionHead)}>
          <Text style={tema.estilo(styles.sectionKickerDark)}>Testimonios</Text>
          <Text style={tema.estilo([styles.sectionTitleDark, isMobile && styles.sectionTitleM])}>
            Quienes ya mueven con nosotros
          </Text>
        </View>

        <View style={tema.estilo(styles.testiGrid)}>
          {testimonials.map((item) => (
            <View key={item.author} style={tema.estilo([styles.testiCard, { width: solWidth }])}>
              <Text style={tema.estilo(styles.testiStars)}>★★★★★</Text>
              <Text style={tema.estilo(styles.testiQuote)}>“{item.quote}”</Text>

              <View style={tema.estilo(styles.testiAuthorRow)}>
                <View style={tema.estilo(styles.testiAvatar)}>
                  <Text style={tema.estilo(styles.testiAvatarText)}>{item.initials}</Text>
                </View>
                <View>
                  <Text style={tema.estilo(styles.testiAuthor)}>{item.author}</Text>
                  <Text style={tema.estilo(styles.testiRole)}>{item.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
