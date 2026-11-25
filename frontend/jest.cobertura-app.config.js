// Cobertura de TODA la app (npm run test:cobertura:app), separada de la del
// cotizador (jest.config.js, que es la que exige el umbral en la CI).
// Mide cada archivo de src, aunque ninguna prueba lo cargue: así el número
// muestra cuánto de la app está realmente probado, no solo el módulo crítico.
const base = require('./jest.config');

module.exports = {
    ...base,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, jsx: 'react-jsx' } }],
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/**/*.d.ts',
        '!src/types/**',
    ],
    // Informativa: se publica para seguir su evolución, no frena la CI.
    coverageThreshold: undefined,
    coverageDirectory: 'coverage-app',
    coverageReporters: ['text-summary', 'json-summary', 'lcov'],
};
