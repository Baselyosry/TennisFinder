import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Required for convex-test to work correctly
    environment: "edge-runtime",
    // Standardizing on the backend package as root
    root: ".",
    // Setup file to mock global fetch for the AI service
    setupFiles: ["./convex/tests/setup.ts"],
    include: ["convex/**/*.test.ts"],
  },
});