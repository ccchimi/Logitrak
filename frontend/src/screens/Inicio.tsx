import React, { useRef, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../styles/InicioStyles';
import {
  coverageCities,
  coverageStats,
  features,
  HERO_IMAGE,
  solutions,
  stats,
  steps,
  trustedBy,
} from '../constants/contenidoInicio';
import PieInicio from '../components/inicio/PieInicio';
import SeccionApp from '../components/inicio/SeccionApp';
import SeccionFaq from '../components/inicio/SeccionFaq';
import SeccionPlanes from '../components/inicio/SeccionPlanes';
import SeccionTestimonios from '../components/inicio/SeccionTestimonios';
import SeccionTracking from '../components/inicio/SeccionTracking';

type SectionKey = 'services' | 'solutions' | 'how' | 'coverage' | 'plans';

type InicioProps = {
  onGoLogin: () => void;
};

export default function Inicio({ onGoLogin }: InicioProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 900;
  const solWidth: DimensionValue = isMobile ? '100%' : '31%';

  const navH = (isMobile ? 64 : 70) + insets.top;

  const [loginHover, setLoginHover] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [sectionY, setSectionY] = useState<Record<SectionKey, number>>({
    services: 0,
    solutions: 0,
    how: 0,
    coverage: 0,
    plans: 0,
  });

  const scrollRef = useRef<ScrollView | null>(null);
  const irArriba = () => {
    setMenuAbierto(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const irASeccion = (section: SectionKey) => {
    setMenuAbierto(false);
    scrollRef.current?.scrollTo({
      y: Math.max(sectionY[section] - (navH + 6), 0),
      animated: true,
    });
  };

  const irAlLogin = () => {
    setMenuAbierto(false);
    onGoLogin();
  };

  const medirSeccion = (section: SectionKey) => (event: any) => {
    const y = event.nativeEvent.layout.y;
    setSectionY((prev) => ({ ...prev, [section]: y }));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View
        style={[
          styles.nav,
          { height: navH, paddingTop: insets.top },
          isMobile && styles.navM,
        ]}
      >
        <TouchableOpacity onPress={irArriba}>
          <Text style={styles.logo}>
            logitrak<Text style={styles.logoDot}>.</Text>
          </Text>
        </TouchableOpacity>

        {!isMobile ? (
          <View style={styles.navLinks}>
            <TouchableOpacity onPress={irArriba}>
              <Text style={styles.navLink}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion('solutions')}>
              <Text style={styles.navLink}>Soluciones</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion('coverage')}>
              <Text style={styles.navLink}>Cobertura</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion('plans')}>
              <Text style={styles.navLink}>Planes</Text>
            </TouchableOpacity>

            <Pressable
              onPress={irAlLogin}
              onHoverIn={() => setLoginHover(true)}
              onHoverOut={() => setLoginHover(false)}
              style={[styles.navCta, loginHover && styles.navCtaHover]}
            >
              <Text style={[styles.navCtaText, loginHover && styles.navCtaTextHover]}>
                Login | Registro
              </Text>
            </Pressable>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuAbierto((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Text style={styles.menuBtnText}>{menuAbierto ? '✕' : '☰'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isMobile && menuAbierto && (
        <View style={[styles.menuPanel, { top: navH }]}>
          <TouchableOpacity style={styles.menuLink} onPress={irArriba}>
            <Text style={styles.menuLinkText}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuLink} onPress={() => irASeccion('services')}>
            <Text style={styles.menuLinkText}>Por qué elegirnos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuLink} onPress={() => irASeccion('solutions')}>
            <Text style={styles.menuLinkText}>Soluciones</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuLink} onPress={() => irASeccion('how')}>
            <Text style={styles.menuLinkText}>El proceso</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuLink} onPress={() => irASeccion('coverage')}>
            <Text style={styles.menuLinkText}>Cobertura</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuLink} onPress={() => irASeccion('plans')}>
            <Text style={styles.menuLinkText}>Planes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCta} onPress={irAlLogin}>
            <Text style={styles.menuCtaText}>Login | Registro</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <ImageBackground
          source={{ uri: HERO_IMAGE }}
          resizeMode="cover"
          style={[styles.hero, { minHeight: height }]}
        >
          <View style={styles.heroOverlay} />

          <View
            style={[
              styles.heroContent,
              { paddingTop: navH + 16 },
              isMobile && styles.heroContentM,
            ]}
          >
            <View style={styles.inner}>
              <Text style={styles.heroKicker}>Logística de última milla</Text>

              <Text style={[styles.heroTitle, isMobile && styles.heroTitleM]}>
                Envíos{'\n'}sin <Text style={styles.accentText}>demoras.</Text>
              </Text>

              <Text style={[styles.heroParagraph, isMobile && styles.heroParagraphM]}>
                Recogemos en tu puerta y entregamos en tiempo récord. Simple,
                confiable, rápido.
              </Text>

              <TouchableOpacity
                style={[styles.heroButton, isMobile && styles.heroButtonM]}
                onPress={irAlLogin}
              >
                <Text style={styles.heroButtonText}>Empezar ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.statsBand}>
          <View style={[styles.statsBar, isMobile && styles.column]}>
            {stats.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.statItem,
                  isMobile && styles.statItemM,
                  !isMobile && index !== stats.length - 1 && styles.borderRight,
                  isMobile && index !== stats.length - 1 && styles.statDividerM,
                ]}
              >
                <Text style={[styles.statNum, isMobile && styles.statNumM]}>{item.num}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.trustedStrip}>
          <View style={styles.inner}>
            <Text style={styles.trustedLabel}>Empresas que confían en logitrak.</Text>

            <View style={styles.trustedRow}>
              {trustedBy.map((nombre) => (
                <Text key={nombre} style={[styles.trustedItem, isMobile && styles.trustedItemM]}>
                  {nombre}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.features, isMobile && styles.sectionM]}
          onLayout={medirSeccion('services')}
        >
          <View style={styles.inner}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionKickerDark}>Por qué elegirnos</Text>
              <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
                Logística diseñada para moverse
              </Text>
            </View>

            <View style={[styles.featuresGrid, isMobile && styles.column]}>
              {features.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.featCard,
                    isMobile && styles.fullWidthM,
                    !isMobile && index !== features.length - 1 && styles.cardDivider,
                    isMobile && styles.cardMobileMargin,
                  ]}
                >
                  <View style={styles.featIcon}>
                    <Text style={styles.featIconText}>{item.indice}</Text>
                  </View>
                  <Text style={styles.featTitle}>{item.title}</Text>
                  <Text style={styles.featText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.solutions, isMobile && styles.sectionM]}
          onLayout={medirSeccion('solutions')}
        >
          <View style={styles.inner}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionKickerDark}>Soluciones</Text>
              <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
                Una operación para cada necesidad
              </Text>
              <Text style={styles.sectionIntro}>
                Desde la última milla hasta el comercio exterior, cubrimos toda la
                cadena con la misma trazabilidad.
              </Text>
            </View>

            <View style={styles.solGrid}>
              {solutions.map((item) => (
                <View key={item.title} style={[styles.solCard, { width: solWidth }]}>
                  <View style={styles.solIcon}>
                    <Text style={styles.solIconText}>{item.indice}</Text>
                  </View>
                  <Text style={styles.solTitle}>{item.title}</Text>
                  <Text style={styles.solText}>{item.text}</Text>
                  <Text style={styles.solLink}>Conocer más →</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.how, isMobile && styles.sectionM]}
          onLayout={medirSeccion('how')}
        >
          <View style={styles.inner}>
            <Text style={styles.sectionKickerLight}>El Proceso</Text>
            <Text style={[styles.sectionTitleLight, isMobile && styles.sectionTitleM]}>
              Cuatro pasos, un solo día
            </Text>

            <View style={[styles.steps, isMobile && styles.column]}>
              {steps.map((item) => (
                <View key={item.num} style={[styles.step, isMobile && styles.stepM]}>
                  <Text style={[styles.stepNum, isMobile && styles.stepNumM]}>{item.num}</Text>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.coverage, isMobile && styles.sectionM]}
          onLayout={medirSeccion('coverage')}
        >
          <View
            style={[
              styles.inner,
              styles.coverageInner,
              isMobile && styles.column,
              isMobile && styles.stackGapM,
            ]}
          >
            <View style={[styles.coverageLeft, isMobile && styles.fullWidthM]}>
              <Text style={styles.sectionKickerLight}>Cobertura</Text>
              <Text style={[styles.sectionTitleLight, isMobile && styles.sectionTitleM]}>
                Llegamos donde tu negocio crece
              </Text>
              <Text style={styles.coverageParagraph}>
                Cubrimos el país conectando grandes
                ciudades y localidades del interior con el mismo estándar.
              </Text>

              <View style={[styles.coverageStatsRow, isMobile && styles.coverageStatsRowM]}>
                {coverageStats.map((item) => (
                  <View key={item.label}>
                    <Text style={styles.coverageStatNum}>{item.num}</Text>
                    <Text style={styles.coverageStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.coverageRight, isMobile && styles.fullWidthM]}>
              {coverageCities.map((ciudad) => (
                <View key={ciudad} style={styles.cityChip}>
                  <Text style={styles.cityChipText}>{ciudad}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <SeccionTracking isMobile={isMobile} />

        <SeccionTestimonios isMobile={isMobile} solWidth={solWidth} />

        <SeccionPlanes
          isMobile={isMobile}
          onLayout={medirSeccion('plans')}
          onElegirPlan={irAlLogin}
        />

        <SeccionApp isMobile={isMobile} />

        <SeccionFaq isMobile={isMobile} />

        <View style={[styles.ctaBand, isMobile && styles.ctaBandM]}>
          <Text style={[styles.ctaTitle, isMobile && styles.ctaTitleM]}>
            ¿Listo para mover tu logística?
          </Text>
          <Text style={styles.ctaText}>
            Creá tu cuenta en minutos y despachá tu primer envío hoy mismo.
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={irAlLogin}>
            <Text style={styles.ctaButtonText}>Empezar ahora</Text>
          </TouchableOpacity>
        </View>

        <PieInicio isMobile={isMobile} />
      </ScrollView>
    </View>
  );
}
