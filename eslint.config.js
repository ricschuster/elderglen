import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "android",
      "node_modules",
      "scripts",
      "docs/reference",
      "docs/wiki",
      "docs/wiki-internal",
      ".claude",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Game rules must stay free of Phaser and the DOM (ADR 0004).
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["phaser", "phaser/*"] }],
    },
  },
);
