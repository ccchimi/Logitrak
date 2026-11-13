import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { trackingSteps } from '../../constants/contenidoInicio';

export default function SeccionTracking({ isMobile }: { isMobile: boolean }) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.tracking, isMobile && styles.sectionM])}>
      <View
        style={tema.estilo([
          styles.inner,
          styles.trackingInner,
          isMobile && styles.column,
          isMobile && styles.stackGapM,
        ])}
      >
        <View style={tema.estilo([styles.trackingTextBlock, isMobile && styles.fullWidthM])}>
          <Text style={tema.estilo(styles.sectionKickerDark)}>En tiempo real</Text>
          <Text style={tema.estilo([styles.sectionTitleDark, isMobile && styles.sectionTitleM])}>
            Mirá cada paso del recorrido
          </Text>
          <Text style={tema.estilo(styles.trackingParagraph)}>
            Cada envío tiene una línea de tiempo viva. Vos y tu cliente ven
            lo mismo, al instante, sin tener que preguntar.
          </Text>
        </View>

        <View style={tema.estilo([styles.trackCard, isMobile && styles.fullWidthM])}>
          <View style={tema.estilo(styles.trackHeaderRow)}>
            <Text style={tema.estilo(styles.trackCode)}>TRK-2026-014</Text>
            <View style={tema.estilo(styles.trackBadge)}>
              <View style={tema.estilo(styles.trackBadgeDot)} />
              <Text style={tema.estilo(styles.trackBadgeText)}>En camino</Text>
            </View>
          </View>

          {trackingSteps.map((paso, i) => (
            <View key={paso.label} style={tema.estilo(styles.trackRow)}>
              <View style={tema.estilo(styles.trackTimeline)}>
                <View
                  style={tema.estilo([styles.trackDot, paso.done && styles.trackDotActive])}
                />
                {i < trackingSteps.length - 1 && (
                  <View
                    style={tema.estilo([
                      styles.trackLineSeg,
                      paso.done && styles.trackLineSegActive,
                    ])}
                  />
                )}
              </View>

              <View style={tema.estilo(styles.trackInfo)}>
                <Text
                  style={tema.estilo([
                    styles.trackLabel,
                    !paso.done && styles.trackLabelMuted,
                  ])}
                >
                  {paso.label}
                </Text>
                <Text style={tema.estilo(styles.trackTime)}>{paso.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
