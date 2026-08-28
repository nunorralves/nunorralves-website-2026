import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright's output. The HTML reporter ships a minified copy of the
    // trace viewer under playwright-report/trace/, which is thousands of
    // lint problems in vendored code, and it only appears once a run has
    // written a trace. Without this, `npm run lint` passes or fails
    // depending on what the last test run left on disk.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
