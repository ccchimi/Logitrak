import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { styles } from '../../styles/InicioStyles';
import { plans } from '../../constants/contenidoInicio';

type Props = {
  isMobile: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onElegirPlan: () => void;
};

export default function SeccionPlanes({ isMobile, onLayout, onElegirPlan }: Props) {
  return (
    <View
      style={[styles.plans, isMobile && styles.sectionM]}
      onLayout={onLayout}
    >
      <View style={styles.inner}>
        <View style={styles.plansHead}>
          <Text style={styles.sectionKickerLight}>Planes</Text>
          <Text style={[styles.sectionTitleLight, isMobile && styles.sectionTitleM]}>
            Precios que escalan con vos
          </Text>
        </View>

        <View style={[styles.plansGrid, isMobile && styles.column]}>
          {plans.map((plan) => (
            <View
              key={plan.name}
              style={[
                styles.planCard,
                isMobile && styles.fullWidthM,
                plan.featured && styles.planCardFeatured,
              ]}
            >
              {plan.featured && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>Más elegido</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>

              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                {plan.unit ? (
                  <Text style={styles.planPriceUnit}>{plan.unit}</Text>
                ) : null}
              </View>

              <View style={styles.planDivider} />

              {plan.items.map((it) => (
                <View key={it} style={styles.planItem}>
                  <Text style={styles.planCheck}>✓</Text>
                  <Text style={styles.planItemText}>{it}</Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={onElegirPlan}
                style={[styles.planBtn, plan.featured && styles.planBtnFeatured]}
              >
                <Text
                  style={[
                    styles.planBtnText,
                    plan.featured && styles.planBtnTextFeatured,
                  ]}
                >
                  {plan.cta}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
