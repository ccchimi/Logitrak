// Cobertura de TODA la app (npm run test:cobertura:app), separada de la del
// cotizador (jest.config.js, que es la que exige el umbral en la CI).
// Mide cada archivo de src, aunque ninguna prueba lo cargue: así el número
// muestra cuánto de la app está realmente probado, no solo el módulo crítico.
const base = require('./jest.config');

// Cada archivo se mide en un solo grupo, para no contarlo dos veces: la lógica
// (.ts) con ts-jest y las pantallas (.tsx) con jest-expo.
const soloLogica = ['/node_modules/', '\\.tsx$'];
const soloPantallas = ['/node_modules/', '\\.ts$'];

module.exports = {
    ...base,
    projects: base.projects.map((p) =>
        p.displayName === 'lógica'
            ? { ...p, coveragePathIgnorePatterns: soloLogica }
            : { ...p, coveragePathIgnorePatterns: soloPantallas }
    ),
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/__pruebas__/**',
        '!src/**/*.d.ts',
        '!src/types/**',
    ],
    // Informativa: se publica para seguir su evolución, no frena la CI.
    coverageThreshold: undefined,
    coverageDirectory: 'coverage-app',
    coverageReporters: ['text-summary', 'json-summary', 'lcov'],
};
