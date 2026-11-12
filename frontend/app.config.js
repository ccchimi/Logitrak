import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  // Solo afecta al export web: GitHub Pages sirve la app bajo /Logitrak.
  // En desarrollo queda vacío y la app corre en la raíz.
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    // Sube los source maps a Sentry en los builds de EAS, para ver los errores
    // con el código original. Necesita SENTRY_AUTH_TOKEN (secreto de EAS); sin
    // él el plugin no se agrega y el build no intenta subir nada.
    ...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
      ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]]
      : []),
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Permitir a logitrak acceder a tu ubicación para el seguimiento de envíos en tiempo real.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Permitir a logitrak usar la cámara para escanear tu DNI y tomar la selfie de verificación de identidad.',
      },
    ],
  ],
});
