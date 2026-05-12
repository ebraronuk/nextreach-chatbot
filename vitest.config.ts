import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config.
 *
 * - alias `@/*` -> `src/*` (Next.js'in tsconfig pathsiyle ortusur)
 * - environment: node (browser bilesenleri test edecegimiz zaman jsdom'a gecer)
 * - include: *.test.ts(x) ve __tests__/ klasoru
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "src/__tests__/**/*.{ts,tsx}"],
    globals: true,
  },
});
