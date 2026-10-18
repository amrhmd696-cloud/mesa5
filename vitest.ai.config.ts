import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Batería de pruebas con la IA real (npm run test:ai). Gasta unos céntimos y
// necesita ANTHROPIC_API_KEY en .env.local; sin clave, las pruebas se saltan.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/ai/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/ai/**/*.test.ts"],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 120_000,
    maxConcurrency: 3,
  },
});
