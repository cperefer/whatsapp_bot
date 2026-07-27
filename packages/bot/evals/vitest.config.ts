import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["evals/cases/**/*.eval.test.ts"],
    setupFiles: ["./evals/vitest.setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Sequential: real Anthropic API calls, easier to read failures one at a
    // time, and avoids hammering rate limits.
    fileParallelism: false,
  },
});
