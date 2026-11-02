import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../../styles/InicioStyles';

export default function PieInicio({ isMobile }: { isMobile: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={[styles.footerTop, isMobile && styles.footerPadM]}>
        <View style={[styles.footerInner, isMobile && styles.column]}>
          <View style={styles.footerBrandCol}>
            <Text style={styles.footerLogo}>
              logitrak<Text style={styles.logoDot}>.</Text>
            </Text>
            <Text style={styles.footerTagline}>
              Movemos la logística de empresas que necesitan previsibilidad.
            </Text>
          </View>

          <View style={styles.footerCol}>
            <Text style={styles.footerColTitle}>Producto</Text>
            <Text style={styles.footerColLink}>Soluciones</Text>
            <Text style={styles.footerColLink}>Cobertura</Text>
            <Text style={styles.footerColLink}>Planes</Text>
            <Text style={styles.footerColLink}>App móvil</Text>
          </View>

          <View style={styles.footerCol}>
            <Text style={styles.footerColTitle}>Empresa</Text>
            <Text style={styles.footerColLink}>Nosotros</Text>
            <Text style={styles.footerColLink}>Trabajá con nosotros</Text>
            <Text style={styles.footerColLink}>Prensa</Text>
            <Text style={styles.footerColLink}>Contacto</Text>
          </View>

          <View style={styles.footerCol}>
            <Text style={styles.footerColTitle}>Legal</Text>
            <Text style={styles.footerColLink}>Términos</Text>
            <Text style={styles.footerColLink}>Privacidad</Text>
            <Text style={styles.footerColLink}>Cookies</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.footerBottom,
          isMobile && styles.footerPadM,
          { paddingBottom: 26 + insets.bottom },
        ]}
      >
        <View style={[styles.footerBottomInner, isMobile && styles.column]}>
          <Text style={styles.footerText}>
            © 2026 logitrak Systems. Todos los derechos reservados.
          </Text>
          <Text style={styles.footerText}>
            Hecho en Argentina
          </Text>
        </View>
      </View>
    </>
  );
}
