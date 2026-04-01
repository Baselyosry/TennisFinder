import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { convexTestModules } from "../../convexTestModules";

function baseItemFields(ownerId: Id<"users">, category: string, user_price: number) {
  return {
    ownerId,
    title: "T",
    description: "D",
    category,
    condition: "Good",
    brand: "B",
    model: "M",
    flaw: "None",
    age_months: 12,
    original_price: 100,
    user_price,
    status: "Available" as const,
    createdAt: Date.now(),
  };
}

describe("items queries", () => {
  it("listAvailableFiltered: filters by category", async () => {
    const t = convexTest(schema, convexTestModules);
    const page = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        email: "o@example.com",
        name: "O",
        role: "PLAYER",
      });
      await ctx.db.insert(
        "items",
        baseItemFields(ownerId, "Racket", 50),
      );
      await ctx.db.insert(
        "items",
        baseItemFields(ownerId, "Shoes", 80),
      );
      return await ctx.db.query("items").collect();
    });
    expect(page.length).toBe(2);

    const rackets = await t.query(api.items.queries.listAvailableFiltered, {
      paginationOpts: { numItems: 10, cursor: null },
      category: "Racket",
    });
    expect(rackets.page.length).toBe(1);
    expect(rackets.page[0]!.category).toBe("Racket");
  });

  it("listAvailableFiltered: min and max price narrow results", async () => {
    const t = convexTest(schema, convexTestModules);
    await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        email: "p@example.com",
        name: "P",
        role: "PLAYER",
      });
      await ctx.db.insert(
        "items",
        baseItemFields(ownerId, "Racket", 30),
      );
      await ctx.db.insert(
        "items",
        baseItemFields(ownerId, "Racket", 100),
      );
    });

    const mid = await t.query(api.items.queries.listAvailableFiltered, {
      paginationOpts: { numItems: 10, cursor: null },
      category: "Racket",
      minPrice: 40,
      maxPrice: 120,
    });
    expect(mid.page.length).toBe(1);
    expect(mid.page[0]!.user_price).toBe(100);
  });

  it("listAll: rejects non-admin", async () => {
    const t = convexTest(schema, convexTestModules);
    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "pl@example.com",
        name: "Pl",
        role: "PLAYER",
      }),
    );
    try {
      await t.withIdentity({ subject: playerId }).query(api.items.queries.listAll, {});
      expect.fail("expected Forbidden");
    } catch (e) {
      expect((e as Error).message).toMatch(/Forbidden|admin/i);
    }
  });
});

describe("users mutations", () => {
  it("updateRole: sets role for authenticated user", async () => {
    const t = convexTest(schema, convexTestModules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "ur@example.com",
        name: "U",
        role: "PLAYER",
      }),
    );
    await t.withIdentity({ subject: userId }).mutation(api.users.updateRole, {
      role: "COURT_OWNER",
    });
    const row = await t.run(async (ctx) => ctx.db.get(userId));
    expect(row?.role).toBe("COURT_OWNER");
  });

  it("syncProfile: patches allowed fields", async () => {
    const t = convexTest(schema, convexTestModules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "sp@example.com",
        name: "S",
        role: "PLAYER",
      }),
    );
    await t.withIdentity({ subject: userId }).mutation(api.users.syncProfile, {
      patch: { firstName: "Sam", phone: "+100" },
    });
    const row = await t.run(async (ctx) => ctx.db.get(userId));
    expect(row?.firstName).toBe("Sam");
    expect(row?.phone).toBe("+100");
  });
});
