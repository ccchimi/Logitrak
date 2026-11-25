// Preparación común para las pruebas de pantallas (jest-expo + Testing Library).
// Se reemplazan los módulos nativos que no existen en Node por versiones mínimas.

// La primera prueba de cada archivo carga React Native en frío y en la CI puede
// pasar los 5 s por defecto de Jest.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-linear-gradient', () => {
    const { View } = require('react-native');
    return { LinearGradient: View };
});
