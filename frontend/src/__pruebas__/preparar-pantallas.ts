// Preparación común para las pruebas de pantallas (jest-expo + Testing Library).
// Se reemplazan los módulos nativos que no existen en Node por versiones mínimas.

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-linear-gradient', () => {
    const { View } = require('react-native');
    return { LinearGradient: View };
});
