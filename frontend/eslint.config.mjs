// Análisis estático de la app (TP4 de Calidad de Software): errores, malas prácticas y complejidad.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "web-build/", "coverage/", ".expo/", "android/", "ios/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  { plugins: { "react-hooks": reactHooks }, rules: reactHooks.configs.recommended.rules },
  {
    rules: {
      // En React Native las imágenes y los módulos nativos opcionales se cargan con require().
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Configuración de Expo, Jest y scripts: corren en Node.
  { files: ["*.js", "*.mjs", "scripts/**"], languageOptions: { globals: { ...globals.node } } },
  { files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"], rules: { "sonarjs/no-hardcoded-ip": "off" } },
);
