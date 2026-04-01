import { expect } from "vitest";

/** convex-test may surface ConvexError.data as a serialized JSON string. */
export function expectConvexErrorCode(err: unknown, code: string): void {
  expect(err).toMatchObject({ name: "ConvexError" });
  const raw = (err as { data: unknown }).data;
  const payload =
    typeof raw === "string"
      ? (JSON.parse(raw) as { code?: string })
      : (raw as { code?: string });
  expect(payload.code).toBe(code);
}
