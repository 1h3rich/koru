import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  // eslint-config-next ya registra el plugin jsx-a11y (solo 6 reglas
  // activas); aquí sumamos el resto de reglas "recommended" (34 en total)
  // sin volver a registrar el plugin, porque eso rompe el flat config.
  { rules: jsxA11y.flatConfigs.recommended.rules },
  security.configs.recommended,
  {
    rules: {
      // Ruido: en revisión (2026-08-03) las 12 alertas que dio en este
      // repo fueron todas lookups con clave fija (VARIANTES[variant],
      // ETIQUETA_DIA[dia]...), nunca índice controlado por el usuario.
      // El resto de reglas de security/ se quedan activas.
      "security/detect-object-injection": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
