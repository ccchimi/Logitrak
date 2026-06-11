import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { styles } from './InicioStyles';

type SectionKey = 'services' | 'solutions' | 'how' | 'coverage' | 'plans';

type InicioProps = {
  onGoLogin: () => void;
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000';

const stats = [
  { num: '98%', label: 'Entregas a tiempo' },
  { num: '2.4h', label: 'Tiempo promedio' },
  { num: '50k+', label: 'Paquetes al mes' },
];

const trustedBy = ['Mercanorte', 'AndesCargo', 'PymeExpress', 'NovaRetail', 'GrupoSur'];

const features = [
  {
    icon: '⚡',
    title: 'Entrega express',
    text: 'Disponemos de rutas optimizadas para garantizar la entrega más rápida en cada zona.',
  },
  {
    icon: '📍',
    title: 'Rastreo en vivo',
    text: 'Seguí tu paquete en tiempo real desde el celular con actualizaciones al instante.',
  },
  {
    icon: '🔒',
    title: 'Envíos seguros',
    text: 'Cada paquete está asegurado y manejado con protocolos de seguridad estrictos.',
  },
];

const solutions = [
  { icon: '🛵', title: 'Última milla', text: 'Entregas urbanas en el día con flota propia y ruteo dinámico por zona.' },
  { icon: '🚛', title: 'Cargas FTL / LTL', text: 'Cargas completas o consolidadas a todo el país, con trazabilidad punta a punta.' },
  { icon: '❄️', title: 'Cadena de frío', text: 'Transporte refrigerado con control y registro de temperatura en tiempo real.' },
  { icon: '🔁', title: 'Logística inversa', text: 'Gestión de devoluciones y cambios sin fricción para tu cliente final.' },
  { icon: '🏬', title: 'Cross-docking', text: 'Consolidamos y redistribuimos sin almacenamiento intermedio para ganar tiempo.' },
  { icon: '🌎', title: 'Comercio exterior', text: 'Importación y exportación con gestión aduanera integrada al envío.' },
];

const coverageStats = [
  { num: '23', label: 'Provincias' },
  { num: '+850', label: 'Localidades' },
  { num: '40', label: 'Centros de distribución' },
];

const coverageCities = [
  'CABA', 'Rosario', 'Córdoba', 'Mendoza', 'La Plata',
  'Mar del Plata', 'Tucumán', 'Salta', 'Neuquén', 'Bahía Blanca',
];

const steps = [
  { num: '01', title: 'Creá tu envío', text: 'Ingresa los datos en nuestra plataforma en 2 minutos.' },
  { num: '02', title: 'Recolección', text: 'Un mensajero retira el paquete por tu domicilio.' },
  { num: '03', title: 'En tránsito', text: 'Monitorea el recorrido en tiempo real mediante GPS.' },
  { num: '04', title: 'Entregado', text: 'Confirmación de recepción inmediata para tu tranquilidad.' },
];

const trackingSteps = [
  { label: 'Pedido confirmado', time: 'Hoy · 08:14', done: true },
  { label: 'Retirado del depósito', time: 'Hoy · 09:02', done: true },
  { label: 'En camino a destino', time: 'Hoy · 11:30', done: true },
  { label: 'En reparto', time: 'Estimado · 14:00', done: false },
  { label: 'Entregado', time: 'Pendiente', done: false },
];

const testimonials = [
  {
    quote: 'Pasamos de tener entregas impredecibles a un 97% a tiempo. El rastreo en vivo nos sacó la mitad de los llamados de soporte.',
    author: 'Lucía Fernández', role: 'Ops Manager · NovaRetail', initials: 'LF',
  },
  {
    quote: 'Integramos la API con nuestra tienda en una tarde. Hoy despachamos el triple de pedidos con el mismo equipo.',
    author: 'Martín Suárez', role: 'Founder · PymeExpress', initials: 'MS',
  },
  {
    quote: 'La cadena de frío con registro de temperatura nos abrió clientes que antes no podíamos atender. Cero rechazos.',
    author: 'Carolina Ríos', role: 'Supply Chain · GrupoSur', initials: 'CR',
  },
];

const plans = [
  {
    name: 'Emprendedor', price: '$0', unit: '/ mes', featured: false, cta: 'Empezar gratis',
    items: ['Hasta 30 envíos por mes', 'Rastreo en vivo', 'Soporte por email'],
  },
  {
    name: 'Pyme', price: '$49', unit: '/ mes', featured: true, cta: 'Probar 14 días',
    items: [
      'Envíos ilimitados', 'Rastreo + alertas automáticas', 'Panel multiusuario',
      'Soporte prioritario', 'API de integración',
    ],
  },
  {
    name: 'Empresa', price: 'A medida', unit: '', featured: false, cta: 'Hablar con ventas',
    items: ['Todo lo del plan Pyme', 'SLA garantizado', 'Account manager dedicado', 'Integraciones a medida'],
  },
];

const faqs = [
  {
    q: '¿Cómo rastreo mi envío?',
    a: 'Cada envío genera un código TRK único. Lo seguís en vivo desde el panel o la app, con actualizaciones automáticas en cada etapa del recorrido.',
  },
  {
    q: '¿Llegan a todo el país?',
    a: 'Sí. Operamos en 23 provincias y más de 850 localidades, con centros de distribución en los principales nodos logísticos del país.',
  },
  {
    q: '¿Puedo integrar Logitrak con mi tienda?',
    a: 'Con el plan Pyme o superior accedés a nuestra API para integrar tu e-commerce o ERP en minutos, sin desarrollo a medida.',
  },
  {
    q: '¿Qué pasa si necesito cancelar un envío?',
    a: 'Podés cancelar sin costo mientras el paquete no haya sido retirado. Después, aplica nuestra política de logística inversa.',
  },
];

export default function Inicio({ onGoLogin }: InicioProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 900;
  const solWidth: DimensionValue = isMobile ? '100%' : '31%';

  const navH = (isMobile ? 64 : 70) + insets.top;

  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);
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
  const phoneFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(phoneFloat, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(phoneFloat, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [phoneFloat]);

  const phoneTranslateY = phoneFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

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

  const toggleFaq = (index: number) => {
    setFaqAbierta((prev) => (prev === index ? null : index));
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
              <Text style={styles.heroKicker}>Logística Inteligente</Text>

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
            <Text style={styles.trustedLabel}>Empresas que confían en Logitrak</Text>

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
                    <Text style={styles.featIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.featTitle}>{item.title}</Text>
                  <Text style={styles.featText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SOLUCIONES */}
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
                    <Text style={styles.solIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.solTitle}>{item.title}</Text>
                  <Text style={styles.solText}>{item.text}</Text>
                  <Text style={styles.solLink}>Conocer más →</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* PROCESO */}
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

        {/* COBERTURA */}
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
                Red logística de punta a punta del país, conectando grandes
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

        {/* SEGUIMIENTO EN VIVO */}
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

        {/* TESTIMONIOS */}
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

        {/* PLANES */}
        <View
          style={[styles.plans, isMobile && styles.sectionM]}
          onLayout={medirSeccion('plans')}
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
                    onPress={irAlLogin}
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

        {/* APP */}
        <View style={[styles.appSection, isMobile && styles.sectionM]}>
          <View style={[styles.inner, !isMobile && styles.appRow]}>
            <View style={[styles.appTextBlock, isMobile && styles.appTextBlockM]}>
              <Text style={styles.sectionKickerDark}>App Logitrak</Text>
              <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
                Todo tu negocio en tu bolsillo
              </Text>
              <Text style={styles.appParagraph}>
                Gestioná envíos, rastreá paquetes y recibí notificaciones desde
                cualquier lugar. Disponible para iOS y Android.
              </Text>

              <View style={styles.storeButtons}>
                <TouchableOpacity style={styles.storeButton}>
                  <Text style={styles.storeButtonText}>🍎 App Store</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.storeButton}>
                  <Text style={styles.storeButtonText}>▶ Google Play</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View
              style={[
                styles.appVisual,
                isMobile && styles.appVisualM,
                { transform: [{ translateY: phoneTranslateY }] },
              ]}
            >
              <View style={styles.phoneMock}>
                <View style={styles.phoneScreen}>
                  <View style={[styles.phoneBar, styles.phoneBarAccent]} />
                  <View style={styles.phoneSpacer} />
                  <PhoneCard width="70%" active />
                  <PhoneCard width="50%" />
                  <PhoneCard width="85%" />
                  <PhoneCard width="60%" active />
                </View>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* FAQ */}
        <View style={[styles.faq, isMobile && styles.sectionM]}>
          <View style={styles.inner}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionKickerDark}>Preguntas frecuentes</Text>
              <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
                Lo que solés querer saber
              </Text>
            </View>

            <View style={styles.faqList}>
              {faqs.map((item, index) => (
                <View key={item.q} style={styles.faqItem}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.faqQuestionRow}
                    onPress={() => toggleFaq(index)}
                  >
                    <Text style={styles.faqQuestion}>{item.q}</Text>
                    <Text style={styles.faqToggle}>
                      {faqAbierta === index ? '−' : '+'}
                    </Text>
                  </TouchableOpacity>

                  {faqAbierta === index && (
                    <Text style={styles.faqAnswer}>{item.a}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA FINAL */}
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

        {/* FOOTER */}
        <View style={[styles.footerTop, isMobile && styles.footerPadM]}>
          <View style={[styles.footerInner, isMobile && styles.column]}>
            <View style={styles.footerBrandCol}>
              <Text style={styles.footerLogo}>
                logitrak<Text style={styles.logoDot}>.</Text>
              </Text>
              <Text style={styles.footerTagline}>
                Innovación en movimiento. Logística inteligente para empresas que
                no se detienen.
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
              © 2026 Logitrak Systems. Todos los derechos reservados.
            </Text>
            <Text style={styles.footerText}>
              Hecho en Argentina 🇦🇷
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PhoneCard({
  width,
  active = false,
}: {
  width: DimensionValue;
  active?: boolean;
}) {
  return (
    <View style={styles.phoneCard}>
      <View style={[styles.phoneDot, !active && styles.phoneDotMuted]} />
      <View style={[styles.phoneBar, { width }]} />
    </View>
  );
}
