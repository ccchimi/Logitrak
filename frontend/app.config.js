import 'dotenv/config';
import { existsSync } from 'node:fs';

const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON || (existsSync('./google-services.json') ? './google-services.json' : undefined);

export default ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
  android: {
    ...config.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    ['expo-notifications', { color: '#FFDE00' }],
    ...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
      ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]]
      : []),
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Permitir a logitrak acceder a tu ubicación para el seguimiento de envíos en tiempo real.',
        locationWhenInUsePermission:
          'Mientras llevás un envío, logitrak comparte tu ubicación con el cliente para que vea dónde está su paquete.',
        locationAlwaysPermission:
          'Si lo activás, logitrak sigue compartiendo tu ubicación con el cliente con la app minimizada, solo mientras dure el viaje.',
        // GPS del chofer con la app minimizada (servicio en primer plano en Android).
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
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
