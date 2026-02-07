import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/smoke/**/*.test.ts"],
    exclude: ["test/smoke/gemini-link.test.ts"],
    globals: true,
    testTimeout: 60_000,
  },
});
