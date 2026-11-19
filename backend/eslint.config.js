// Análisis estático de la API (TP4 de Calidad de Software): errores, malas prácticas y complejidad.
import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default [
    // cotizador.generado.js lo arma esbuild desde el código de la app: se analiza en el frontend.
    { ignores: ['node_modules/', 'coverage/', 'dist/', 'src/servicios/cotizador/cotizador.generado.js'] },
    js.configs.recommended,
    sonarjs.configs.recommended,
    { languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } } },
];
