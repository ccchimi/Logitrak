import { useTema } from "../hooks/useTema";
import React, { useRef, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import type { DimensionValue } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../styles/InicioStyles";
import {
  coverageCities,
  coverageStats,
  features,
  HERO_IMAGE,
  solutions,
  stats,
  steps,
  trustedBy,
} from "../constants/contenidoInicio";
import Desplegable from "../components/Desplegable";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import PieInicio from "../components/inicio/PieInicio";
import SeccionApp from "../components/inicio/SeccionApp";
import SeccionFaq from "../components/inicio/SeccionFaq";
import SeccionPlanes from "../components/inicio/SeccionPlanes";
import SeccionTestimonios from "../components/inicio/SeccionTestimonios";
import SeccionTracking from "../components/inicio/SeccionTracking";

type SectionKey = "services" | "solutions" | "how" | "coverage" | "plans";

type InicioProps = {
  onGoLogin: () => void;
};

export default function Inicio({ onGoLogin }: InicioProps) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 900;
  const solWidth: DimensionValue = isMobile ? "100%" : "31%";

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
    scrollRef.current?.scrollTo({ y: 0, animated: !reducido });
  };

  const irASeccion = (section: SectionKey) => {
    setMenuAbierto(false);
    scrollRef.current?.scrollTo({
      y: Math.max(sectionY[section] - (navH + 6), 0),
      animated: !reducido,
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
    <View style={tema.estilo(styles.root)}>
      <StatusBar style={tema.claro ? "dark" : "light"} />

      <View
        style={tema.estilo([
          styles.nav,
          { height: navH, paddingTop: insets.top },
          isMobile && styles.navM,
        ])}
      >
        <TouchableOpacity onPress={irArriba}>
          <Text style={tema.estilo(styles.logo)}>
            logitrak<Text style={tema.estilo(styles.logoDot)}>.</Text>
          </Text>
        </TouchableOpacity>

        {!isMobile ? (
          <View style={tema.estilo(styles.navLinks)}>
            <TouchableOpacity onPress={irArriba}>
              <Text style={tema.estilo(styles.navLink)}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion("solutions")}>
              <Text style={tema.estilo(styles.navLink)}>Soluciones</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion("coverage")}>
              <Text style={tema.estilo(styles.navLink)}>Cobertura</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion("plans")}>
              <Text style={tema.estilo(styles.navLink)}>Planes</Text>
            </TouchableOpacity>

            <Pressable
              onPress={irAlLogin}
              onHoverIn={() => setLoginHover(true)}
              onHoverOut={() => setLoginHover(false)}
              style={tema.estilo([styles.navCta, loginHover && styles.navCtaHover])}
            >
              <Text
                style={tema.estilo([
                  styles.navCtaText,
                  loginHover && styles.navCtaTextHover,
                ])}
              >
                Login | Registro
              </Text>
            </Pressable>
          </View>
        ) : (
          <TouchableOpacity
            style={tema.estilo(styles.menuBtn)}
            onPress={() => setMenuAbierto((prev) => !prev)}
            accessibilityRole="button"
            aria-expanded={menuAbierto}
            accessibilityState={{ expanded: menuAbierto }}
            accessibilityLabel={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          >
            <Text style={tema.estilo(styles.menuBtnText)}>{menuAbierto ? "✕" : "☰"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Desplegable
        visible={isMobile && menuAbierto}
        style={tema.estilo([styles.menuPanel, { top: navH }])}
      >
        <TouchableOpacity style={tema.estilo(styles.menuLink)} onPress={irArriba}>
          <Text style={tema.estilo(styles.menuLinkText)}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tema.estilo(styles.menuLink)}
          onPress={() => irASeccion("services")}
        >
          <Text style={tema.estilo(styles.menuLinkText)}>Por qué elegirnos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tema.estilo(styles.menuLink)}
          onPress={() => irASeccion("solutions")}
        >
          <Text style={tema.estilo(styles.menuLinkText)}>Soluciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tema.estilo(styles.menuLink)}
          onPress={() => irASeccion("how")}
        >
          <Text style={tema.estilo(styles.menuLinkText)}>El proceso</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tema.estilo(styles.menuLink)}
          onPress={() => irASeccion("coverage")}
        >
          <Text style={tema.estilo(styles.menuLinkText)}>Cobertura</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tema.estilo(styles.menuLink)}
          onPress={() => irASeccion("plans")}
        >
          <Text style={tema.estilo(styles.menuLinkText)}>Planes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tema.estilo(styles.menuCta)} onPress={irAlLogin}>
          <Text style={tema.estilo(styles.menuCtaText)}>Login | Registro</Text>
        </TouchableOpacity>
      </Desplegable>

      <ScrollView
        ref={scrollRef}
        style={tema.estilo(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={require("../../assets/hero-warehouse.jpg")}
          resizeMode="cover"
          style={tema.estilo([styles.hero, { minHeight: height }])}
        >
          <View style={tema.estilo(styles.heroOverlay)} />

          <View
            style={tema.estilo([
              styles.heroContent,
              { paddingTop: navH + 16 },
              isMobile && styles.heroContentM,
            ])}
          >
            <View style={tema.estilo(styles.inner)}>
              <Text style={styles.heroKicker}>Logística inteligente</Text>

              <Text style={[styles.heroTitle, isMobile && styles.heroTitleM]}>
                Envíos{"\n"}sin <Text style={styles.accentText}>demoras.</Text>
              </Text>

              <Text
                style={[
                  styles.heroParagraph,
                  isMobile && styles.heroParagraphM,
                ]}
              >
                Recogemos en tu puerta y entregamos en tiempo récord. Simple,
                confiable, rápido.
              </Text>

              <TouchableOpacity
                style={tema.estilo([styles.heroButton, isMobile && styles.heroButtonM])}
                onPress={irAlLogin}
              >
                <Text style={tema.estilo(styles.heroButtonText)}>Empezar ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={tema.estilo(styles.statsBand)}>
          <View style={tema.estilo([styles.statsBar, isMobile && styles.column])}>
            {stats.map((item, index) => (
              <View
                key={item.label}
                style={tema.estilo([
                  styles.statItem,
                  isMobile && styles.statItemM,
                  !isMobile && index !== stats.length - 1 && styles.borderRight,
                  isMobile && index !== stats.length - 1 && styles.statDividerM,
                ])}
              >
                <Text style={tema.estilo([styles.statNum, isMobile && styles.statNumM])}>
                  {item.num}
                </Text>
                <Text style={tema.estilo(styles.statLabel)}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={tema.estilo(styles.trustedStrip)}>
          <View style={tema.estilo(styles.inner)}>
            <Text style={tema.estilo(styles.trustedLabel)}>
              Empresas que confían en logitrak.
            </Text>

            <View style={tema.estilo(styles.trustedRow)}>
              {trustedBy.map((nombre) => (
                <Text
                  key={nombre}
                  style={tema.estilo([styles.trustedItem, isMobile && styles.trustedItemM])}
                >
                  {nombre}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View
          style={tema.estilo([styles.features, isMobile && styles.sectionM])}
          onLayout={medirSeccion("services")}
        >
          <View style={tema.estilo(styles.inner)}>
            <View style={tema.estilo(styles.sectionHead)}>
              <Text style={tema.estilo(styles.sectionKickerDark)}>Por qué elegirnos</Text>
              <Text
                style={tema.estilo([
                  styles.sectionTitleDark,
                  isMobile && styles.sectionTitleM,
                ])}
              >
                Logística diseñada para moverse
              </Text>
            </View>

            <View style={tema.estilo([styles.featuresGrid, isMobile && styles.column])}>
              {features.map((item, index) => (
                <View
                  key={item.title}
                  style={tema.estilo([
                    styles.featCard,
                    isMobile && styles.fullWidthM,
                    !isMobile &&
                      index !== features.length - 1 &&
                      styles.cardDivider,
                    isMobile && styles.cardMobileMargin,
                  ])}
                >
                  <View style={tema.estilo(styles.featIcon)}>
                    <Text style={tema.estilo(styles.featIconText)}>{item.indice}</Text>
                  </View>
                  <Text style={tema.estilo(styles.featTitle)}>{item.title}</Text>
                  <Text style={tema.estilo(styles.featText)}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={tema.estilo([styles.solutions, isMobile && styles.sectionM])}
          onLayout={medirSeccion("solutions")}
        >
          <View style={tema.estilo(styles.inner)}>
            <View style={tema.estilo(styles.sectionHead)}>
              <Text style={tema.estilo(styles.sectionKickerDark)}>Soluciones</Text>
              <Text
                style={tema.estilo([
                  styles.sectionTitleDark,
                  isMobile && styles.sectionTitleM,
                ])}
              >
                Una operación para cada necesidad
              </Text>
              <Text style={tema.estilo(styles.sectionIntro)}>
                Desde la última milla hasta el comercio exterior, cubrimos toda
                la cadena con la misma trazabilidad.
              </Text>
            </View>

            <View style={tema.estilo(styles.solGrid)}>
              {solutions.map((item) => (
                <View
                  key={item.title}
                  style={tema.estilo([styles.solCard, { width: solWidth }])}
                >
                  <View style={tema.estilo(styles.solIcon)}>
                    <Text style={tema.estilo(styles.solIconText)}>{item.indice}</Text>
                  </View>
                  <Text style={tema.estilo(styles.solTitle)}>{item.title}</Text>
                  <Text style={tema.estilo(styles.solText)}>{item.text}</Text>
                  <Text style={tema.estilo(styles.solLink)}>Conocer más →</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={tema.estilo([styles.how, isMobile && styles.sectionM])}
          onLayout={medirSeccion("how")}
        >
          <View style={tema.estilo(styles.inner)}>
            <Text style={tema.estilo(styles.sectionKickerLight)}>El Proceso</Text>
            <Text
              style={tema.estilo([
                styles.sectionTitleLight,
                isMobile && styles.sectionTitleM,
              ])}
            >
              Cuatro pasos, un solo día
            </Text>

            <View style={tema.estilo([styles.steps, isMobile && styles.column])}>
              {steps.map((item) => (
                <View
                  key={item.num}
                  style={tema.estilo([styles.step, isMobile && styles.stepM])}
                >
                  <Text style={tema.estilo([styles.stepNum, isMobile && styles.stepNumM])}>
                    {item.num}
                  </Text>
                  <Text style={tema.estilo(styles.stepTitle)}>{item.title}</Text>
                  <Text style={tema.estilo(styles.stepText)}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View
          style={tema.estilo([styles.coverage, isMobile && styles.sectionM])}
          onLayout={medirSeccion("coverage")}
        >
          <View
            style={tema.estilo([
              styles.inner,
              styles.coverageInner,
              isMobile && styles.column,
              isMobile && styles.stackGapM,
            ])}
          >
            <View style={tema.estilo([styles.coverageLeft, isMobile && styles.fullWidthM])}>
              <Text style={tema.estilo(styles.sectionKickerLight)}>Cobertura</Text>
              <Text
                style={tema.estilo([
                  styles.sectionTitleLight,
                  isMobile && styles.sectionTitleM,
                ])}
              >
                Llegamos donde tu negocio crece
              </Text>
              <Text style={tema.estilo(styles.coverageParagraph)}>
                Cubrimos el país conectando grandes ciudades y localidades del
                interior con el mismo estándar.
              </Text>

              <View
                style={tema.estilo([
                  styles.coverageStatsRow,
                  isMobile && styles.coverageStatsRowM,
                ])}
              >
                {coverageStats.map((item) => (
                  <View key={item.label}>
                    <Text style={tema.estilo(styles.coverageStatNum)}>{item.num}</Text>
                    <Text style={tema.estilo(styles.coverageStatLabel)}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={tema.estilo([styles.coverageRight, isMobile && styles.fullWidthM])}>
              {coverageCities.map((ciudad) => (
                <View key={ciudad} style={tema.estilo(styles.cityChip)}>
                  <Text style={tema.estilo(styles.cityChipText)}>{ciudad}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <SeccionTracking isMobile={isMobile} />

        <SeccionTestimonios isMobile={isMobile} solWidth={solWidth} />

        <SeccionPlanes
          isMobile={isMobile}
          onLayout={medirSeccion("plans")}
          onElegirPlan={irAlLogin}
        />

        <SeccionApp isMobile={isMobile} />

        <SeccionFaq isMobile={isMobile} />

        <View style={tema.estilo([styles.ctaBand, isMobile && styles.ctaBandM])}>
          <Text style={tema.estilo([styles.ctaTitle, isMobile && styles.ctaTitleM])}>
            ¿Listo para mover tu logística?
          </Text>
          <Text style={tema.estilo(styles.ctaText)}>
            Creá tu cuenta en minutos y despachá tu primer envío hoy mismo.
          </Text>
          <TouchableOpacity style={tema.estilo(styles.ctaButton)} onPress={irAlLogin}>
            <Text style={tema.estilo(styles.ctaButtonText)}>Empezar ahora</Text>
          </TouchableOpacity>
        </View>

        <PieInicio isMobile={isMobile} />
      </ScrollView>
    </View>
  );
}
