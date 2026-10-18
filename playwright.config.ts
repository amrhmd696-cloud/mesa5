import { defineConfig, devices } from "@playwright/test";

// Tests de extremo a extremo. Se prueban dos tamaños: móvil (lo más usado
// por los dueños de restaurantes) y escritorio.
// Ejecuta `npm run build` antes de `npm run test:e2e`.
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:3100",
    // Opcional: ruta a un Chromium ya instalado (útil en entornos sin descarga de navegadores).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
