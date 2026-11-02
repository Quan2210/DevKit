import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      "stage/**",
      ".react-router/**",
      "node_modules/**",
      "docs/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Privacy / safety: user input must never be executed (PRD 4.2, SD-13).
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    // All user-visible text comes from the i18n catalog (docs/04 Change 1.13b).
    files: ["src/components/**/*.tsx", "src/routes/**/*.tsx", "src/features/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/\\S/]",
          message: "Put user-visible text in src/i18n/locales/vi.ts and render it with t().",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "Only components/common/SafeHtml.tsx may set innerHTML (sanitized HTML from the Markdown pipeline).",
        },
      ],
    },
  },
  {
    // Every way of turning a string into markup, in .ts as well as .tsx (docs/04 Appendix B M4 L-3).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "src/components/common/SafeHtml.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["innerHTML", "outerHTML", "insertAdjacentHTML"].map((property) => ({
          property,
          message: "Only components/common/SafeHtml.tsx may write markup (sanitized HTML).",
        })),
        {
          object: "document",
          property: "write",
          message: "document.write is not allowed.",
        },
      ],
    },
  },
  {
    // The one audited trust boundary for innerHTML (docs/04 Change 4.6).
    files: ["src/components/common/SafeHtml.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["**/*.{mjs,ts}", "*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
);
