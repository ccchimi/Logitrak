import 'dotenv/config';

export default ({ config }) => ({
  ...config,
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
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Permitir a LogiTrack acceder a tu ubicación para el seguimiento de envíos en tiempo real.',
      },
    ],
  ],
});
