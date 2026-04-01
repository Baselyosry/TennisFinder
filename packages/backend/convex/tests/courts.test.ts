import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { convexTestModules } from "../../convexTestModules";
import { expectConvexErrorCode } from "./helpers";

const MS_PER_HOUR = 60 * 60 * 1000;

describe("courts mutations", () => {
  it("createCourt: PLAYER is forbidden", async () => {
    const t = convexTest(schema, convexTestModules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "pl@example.com",
        name: "P",
        role: "PLAYER",
      }),
    );
    try {
      await t.withIdentity({ subject: userId }).mutation(
        api.courts.mutations.createCourt,
        {
          name: "C1",
          address: "1 St",
          location: { lat: 0, lng: 0 },
          surfaceType: "Hard",
          pricePerHour: 50,
        },
      );
      expect.fail("expected FORBIDDEN");
    } catch (err) {
      expectConvexErrorCode(err, "FORBIDDEN");
    }
  });

  it("createCourt: COURT_OWNER succeeds", async () => {
    const t = convexTest(schema, convexTestModules);
    const ownerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "ow@example.com",
        name: "O",
        role: "COURT_OWNER",
      }),
    );
    const courtId = await t.withIdentity({ subject: ownerId }).mutation(
      api.courts.mutations.createCourt,
      {
        name: "Center",
        address: "2 Ave",
        location: { lat: 1, lng: 2 },
        surfaceType: "Clay",
        pricePerHour: 90,
      },
    );
    const court = await t.run(async (ctx) => ctx.db.get(courtId));
    expect(court?.ownerId).toEqual(ownerId);
    expect(court?.name).toBe("Center");
  });

  it("updateCourt: non-owner forbidden", async () => {
    const t = convexTest(schema, convexTestModules);
    const { ownerId, otherId, courtId } = await t.run(async (ctx) => {
      const o = await ctx.db.insert("users", {
        email: "a@example.com",
        name: "A",
        role: "COURT_OWNER",
      });
      const p = await ctx.db.insert("users", {
        email: "b@example.com",
        name: "B",
        role: "COURT_OWNER",
      });
      const c = await ctx.db.insert("courts", {
        ownerId: o,
        name: "X",
        address: "Y",
        location: { lat: 0, lng: 0 },
        surfaceType: "Hard",
        pricePerHour: 10,
        createdAt: 0,
      });
      return { ownerId: o, otherId: p, courtId: c };
    });
    try {
      await t.withIdentity({ subject: otherId }).mutation(
        api.courts.mutations.updateCourt,
        { courtId, patch: { name: "Hacked" } },
      );
      expect.fail("expected FORBIDDEN");
    } catch (err) {
      expectConvexErrorCode(err, "FORBIDDEN");
    }
    const row = await t.run(async (ctx) => ctx.db.get(courtId));
    expect(row?.name).toBe("X");
  });

  it("deleteCourt: fails when any booking exists", async () => {
    const t = convexTest(schema, convexTestModules);
    const { ownerId, courtId } = await t.run(async (ctx) => {
      const oid = await ctx.db.insert("users", {
        email: "ow2@example.com",
        name: "O2",
        role: "COURT_OWNER",
      });
      const pid = await ctx.db.insert("users", {
        email: "pv@example.com",
        name: "Pv",
        role: "PLAYER",
      });
      const cid = await ctx.db.insert("courts", {
        ownerId: oid,
        name: "Z",
        address: "Z",
        location: { lat: 0, lng: 0 },
        surfaceType: "Hard",
        pricePerHour: 20,
        createdAt: 0,
      });
      const start = 1_000_000;
      await ctx.db.insert("bookings", {
        courtId: cid,
        playerId: pid,
        startTime: start,
        endTime: start + MS_PER_HOUR,
        totalPrice: 20,
        status: "Cancelled",
        createdAt: start,
      });
      return { ownerId: oid, courtId: cid };
    });

    try {
      await t.withIdentity({ subject: ownerId }).mutation(
        api.courts.mutations.deleteCourt,
        { courtId },
      );
      expect.fail("expected COURT_HAS_BOOKINGS");
    } catch (err) {
      expectConvexErrorCode(err, "COURT_HAS_BOOKINGS");
    }
  });
});
