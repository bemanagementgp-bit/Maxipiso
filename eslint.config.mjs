import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Configuración de ESLint.
 *
 * Sin `FlatCompat`. `eslint-config-next` 16 ya exporta flat config —un array de
 * bloques, que es lo que ESLint 9 espera— y pasarlo igual por el compat de
 * eslintrc terminaba en `TypeError: Converting circular structure to JSON`:
 * el plugin de React se referencia a sí mismo y el validador viejo intenta
 * serializarlo. Con eso, `npm run lint` no corría.
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Las variables de descarte con _ son intencionales.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
];

export default config;
