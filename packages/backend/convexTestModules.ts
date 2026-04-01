/**
 * Vitest-only module map for convex-test (must live outside convex/ — Convex bundler rejects import.meta there).
 */
export const convexTestModules = {
  ...import.meta.glob("./convex/_generated/**/*.ts"),
  ...import.meta.glob("./convex/auth.ts"),
  ...import.meta.glob("./convex/http.ts"),
  ...import.meta.glob("./convex/users.ts"),
  ...import.meta.glob("./convex/images.ts"),
  ...import.meta.glob("./convex/seed.ts"),
  ...import.meta.glob("./convex/items/**/*.ts"),
  ...import.meta.glob("./convex/bookings/**/*.ts"),
  ...import.meta.glob("./convex/courts/**/*.ts"),
  ...import.meta.glob("./convex/owners/**/*.ts"),
};
