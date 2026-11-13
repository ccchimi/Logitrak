import { useTema } from "../../hooks/useTema";
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
  const tema = useTema();
  return (
    <View
      style={tema.estilo([styles.plans, isMobile && styles.sectionM])}
      onLayout={onLayout}
    >
      <View style={tema.estilo(styles.inner)}>
        <View style={tema.estilo(styles.plansHead)}>
          <Text style={tema.estilo(styles.sectionKickerLight)}>Planes</Text>
          <Text style={tema.estilo([styles.sectionTitleLight, isMobile && styles.sectionTitleM])}>
            Precios que escalan con vos
          </Text>
        </View>

        <View style={tema.estilo([styles.plansGrid, isMobile && styles.column])}>
          {plans.map((plan) => (
            <View
              key={plan.name}
              style={tema.estilo([
                styles.planCard,
                isMobile && styles.fullWidthM,
                plan.featured && styles.planCardFeatured,
              ])}
            >
              {plan.featured && (
                <View style={tema.estilo(styles.planBadge)}>
                  <Text style={tema.estilo(styles.planBadgeText)}>Más elegido</Text>
                </View>
              )}

              <Text style={tema.estilo(styles.planName)}>{plan.name}</Text>

              <View style={tema.estilo(styles.planPriceRow)}>
                <Text style={tema.estilo(styles.planPrice)}>{plan.price}</Text>
                {plan.unit ? (
                  <Text style={tema.estilo(styles.planPriceUnit)}>{plan.unit}</Text>
                ) : null}
              </View>

              <View style={tema.estilo(styles.planDivider)} />

              {plan.items.map((it) => (
                <View key={it} style={tema.estilo(styles.planItem)}>
                  <Text style={tema.estilo(styles.planCheck)}>✓</Text>
                  <Text style={tema.estilo(styles.planItemText)}>{it}</Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={onElegirPlan}
                style={tema.estilo([styles.planBtn, plan.featured && styles.planBtnFeatured])}
              >
                <Text
                  style={tema.estilo([
                    styles.planBtnText,
                    plan.featured && styles.planBtnTextFeatured,
                  ])}
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
