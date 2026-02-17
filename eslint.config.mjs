import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ── Type-safety ──────────────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // ── Code complexity / writability ────────────────────────
      complexity: ["warn", { max: 25 }],
      "max-depth": ["warn", { max: 5 }],
      "max-lines-per-function": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", { max: 5 }],
      "max-nested-callbacks": ["warn", { max: 4 }],
      "no-else-return": "warn",
    },
  },
  {
    // Relax complexity limits for test files
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "max-lines-per-function": "off",
      complexity: "off",
      "max-nested-callbacks": "off",
      "max-depth": "off",
    },
  },
  {
    ignores: [
      "**/out/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.js",
      "**/*.mjs",
    ],
  },
);
