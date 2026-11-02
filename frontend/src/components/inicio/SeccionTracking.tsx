import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { trackingSteps } from '../../constants/contenidoInicio';

export default function SeccionTracking({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[styles.tracking, isMobile && styles.sectionM]}>
      <View
        style={[
          styles.inner,
          styles.trackingInner,
          isMobile && styles.column,
          isMobile && styles.stackGapM,
        ]}
      >
        <View style={[styles.trackingTextBlock, isMobile && styles.fullWidthM]}>
          <Text style={styles.sectionKickerDark}>En tiempo real</Text>
          <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
            Mirá cada paso del recorrido
          </Text>
          <Text style={styles.trackingParagraph}>
            Cada envío tiene una línea de tiempo viva. Vos y tu cliente ven
            lo mismo, al instante, sin tener que preguntar.
          </Text>
        </View>

        <View style={[styles.trackCard, isMobile && styles.fullWidthM]}>
          <View style={styles.trackHeaderRow}>
            <Text style={styles.trackCode}>TRK-2026-014</Text>
            <View style={styles.trackBadge}>
              <View style={styles.trackBadgeDot} />
              <Text style={styles.trackBadgeText}>En camino</Text>
            </View>
          </View>

          {trackingSteps.map((paso, i) => (
            <View key={paso.label} style={styles.trackRow}>
              <View style={styles.trackTimeline}>
                <View
                  style={[styles.trackDot, paso.done && styles.trackDotActive]}
                />
                {i < trackingSteps.length - 1 && (
                  <View
                    style={[
                      styles.trackLineSeg,
                      paso.done && styles.trackLineSegActive,
                    ]}
                  />
                )}
              </View>

              <View style={styles.trackInfo}>
                <Text
                  style={[
                    styles.trackLabel,
                    !paso.done && styles.trackLabelMuted,
                  ]}
                >
                  {paso.label}
                </Text>
                <Text style={styles.trackTime}>{paso.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
