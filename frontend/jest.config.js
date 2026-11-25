// Dos grupos de pruebas:
//  - lógica: servicios, helpers y el cotizador, en Node con ts-jest (*.test.ts).
//  - pantallas: componentes visuales renderizados con jest-expo y Testing
//    Library (*.test.tsx).
// La cobertura que exige el umbral es la del cotizador, el módulo crítico. La
// de toda la app se mide aparte con jest.cobertura-app.config.js.
const logica = {
    displayName: 'lógica',
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true } }],
    },
};

const pantallas = {
    displayName: 'pantallas',
    preset: 'jest-expo',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.tsx'],
    setupFilesAfterEnv: ['<rootDir>/src/__pruebas__/preparar-pantallas.ts'],
    // El cotizador se mide con el grupo de lógica; si también lo midiera este
    // grupo (que compila con Babel), Jest mezclaría dos mediciones distintas.
    coveragePathIgnorePatterns: ['/node_modules/', '/src/services/botLogistica/'],
};

module.exports = {
    projects: [logica, pantallas],
    collectCoverageFrom: [
        'src/services/botLogistica/{tarifas,cargas,direcciones,nlp}.ts',
    ],
    coverageThreshold: {
        global: { statements: 80, branches: 70, functions: 80, lines: 80 },
    },
};
