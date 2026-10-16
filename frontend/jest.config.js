/**
 * Pruebas unitarias de la lógica pura del frontend (sin React Native).
 * Ver docs/qa/plan-de-pruebas-cotizador.md
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true } }],
    },
    collectCoverageFrom: [
        'src/services/botLogistica/{tarifas,cargas,direcciones,nlp}.ts',
    ],
    coverageThreshold: {
        global: { statements: 80, branches: 70, functions: 80, lines: 80 },
    },
};
