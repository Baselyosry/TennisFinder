/// <reference types="vite/client" />

/**
 * Module map for convex-test. Must include `_generated` (see findModulesRoot in convex-test).
 * Excludes this test tree so `.test.ts` files are not registered as Convex functions.
 */
export const convexTestModules = import.meta.glob([
  "./**/*.*s",
  "!./tests/**",
]);
