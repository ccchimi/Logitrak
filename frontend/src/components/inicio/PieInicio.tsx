import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../../styles/InicioStyles';

export default function PieInicio({ isMobile }: { isMobile: boolean }) {
  const tema = useTema();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={tema.estilo([styles.footerTop, isMobile && styles.footerPadM])}>
        <View style={tema.estilo([styles.footerInner, isMobile && styles.column])}>
          <View style={tema.estilo(styles.footerBrandCol)}>
            <Text style={tema.estilo(styles.footerLogo)}>
              logitrak<Text style={tema.estilo(styles.logoDot)}>.</Text>
            </Text>
            <Text style={tema.estilo(styles.footerTagline)}>
              Movemos la logística de empresas que necesitan previsibilidad.
            </Text>
          </View>

          <View style={tema.estilo(styles.footerCol)}>
            <Text style={tema.estilo(styles.footerColTitle)}>Producto</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Soluciones</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Cobertura</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Planes</Text>
            <Text style={tema.estilo(styles.footerColLink)}>App móvil</Text>
          </View>

          <View style={tema.estilo(styles.footerCol)}>
            <Text style={tema.estilo(styles.footerColTitle)}>Empresa</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Nosotros</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Trabajá con nosotros</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Prensa</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Contacto</Text>
          </View>

          <View style={tema.estilo(styles.footerCol)}>
            <Text style={tema.estilo(styles.footerColTitle)}>Legal</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Términos</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Privacidad</Text>
            <Text style={tema.estilo(styles.footerColLink)}>Cookies</Text>
          </View>
        </View>
      </View>

      <View
        style={tema.estilo([
          styles.footerBottom,
          isMobile && styles.footerPadM,
          { paddingBottom: 26 + insets.bottom },
        ])}
      >
        <View style={tema.estilo([styles.footerBottomInner, isMobile && styles.column])}>
          <Text style={tema.estilo(styles.footerText)}>
            © 2026 logitrak Systems. Todos los derechos reservados.
          </Text>
          <Text style={tema.estilo(styles.footerText)}>
            Hecho en Argentina
          </Text>
        </View>
      </View>
    </>
  );
}
