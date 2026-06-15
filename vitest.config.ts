import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/src/**/*.test.ts"],
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["packages/core/src/**/*.ts"],
      exclude: [
        "packages/**/src/**/*.test.ts",
        "packages/**/src/**/*.d.ts",
        "packages/**/src/test/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    setupFiles: ["./packages/vscode/src/test/setup.ts", "./packages/cli/src/test/setup.ts"],
    mockReset: true,
    restoreMocks: true,
  },
});
