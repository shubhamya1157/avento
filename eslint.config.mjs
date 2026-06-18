// ===========================================================================
// eslint.config.mjs — The rulebook for our code "spell-checker"
// ===========================================================================
//
// ESLint is a "linter": a tool that reads our code and warns about likely
// mistakes or messy style — like a spell- and grammar-checker, but for
// JavaScript and TypeScript. This file is its settings (its rulebook).
//
// The ".mjs" ending means this is a JavaScript "module" (a self-contained file
// that shares its settings using `export`).
//
// Instead of writing hundreds of rules by hand, we borrow two ready-made sets
// of rules made by the Next.js team and switch them both on.
// ===========================================================================

// `defineConfig` is a small helper that builds the final settings object.
// `globalIgnores` lets us list files/folders ESLint should completely skip.
import { defineConfig, globalIgnores } from "eslint/config";
// A ready-made rule set focused on "Core Web Vitals" — Google's measurements of
// how fast and smooth a page feels for real visitors.
import nextVitals from "eslint-config-next/core-web-vitals";
// A ready-made rule set with sensible checks for TypeScript code.
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // The `...` ("spread") unpacks each borrowed rule set and drops all of its
  // rules right here, so both are active.
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Tell ESLint NOT to check these — they're either auto-generated build output
  // or files we don't write by hand, so warnings about them aren't useful.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",      // Next.js's build folder (generated automatically)
    "out/**",        // Exported static-site output (generated)
    "build/**",      // Another common build-output folder (generated)
    "next-env.d.ts", // A type file Next.js writes for us — never edited by hand
  ]),
]);

// Hand the finished rulebook to ESLint.
export default eslintConfig;
