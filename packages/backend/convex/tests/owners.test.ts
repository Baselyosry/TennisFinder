import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { convexTestModules } from "../../convexTestModules";
import { expectConvexErrorCode } from "./helpers";

const MS_PER_HOUR = 60 * 60 * 1000;

describe("owners queries", () => {
  it("getOwnerStats: non-owner forbidden", async () => {
    const t = convexTest(schema, convexTestModules);
    const playerId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "np@example.com",
        name: "N",
        role: "PLAYER",
      }),
    );
    try {
      await t.withIdentity({ subject: playerId }).query(
        api.owners.queries.getOwnerStats,
        { rangeStart: 0, rangeEnd: 1_000_000_000 },
      );
      expect.fail("expected FORBIDDEN");
    } catch (err) {
      expectConvexErrorCode(err, "FORBIDDEN");
    }
  });

  it("getOwnerStats: aggregates bookings in range", async () => {
    const t = convexTest(schema, convexTestModules);
    const rangeStart = 0;
    const rangeEnd = 100_000_000;
    const ownerId = await t.run(async (ctx) => {
      const oid = await ctx.db.insert("users", {
        email: "st@example.com",
        name: "Owner",
        role: "COURT_OWNER",
      });
      const pid = await ctx.db.insert("users", {
        email: "bk@example.com",
        name: "Booker",
        role: "PLAYER",
      });
      const cid = await ctx.db.insert("courts", {
        ownerId: oid,
        name: "StatCourt",
        address: "A",
        location: { lat: 0, lng: 0 },
        surfaceType: "Hard",
        pricePerHour: 25,
        createdAt: 0,
      });
      const mid = 1_000_000;
      await ctx.db.insert("bookings", {
        courtId: cid,
        playerId: pid,
        startTime: mid,
        endTime: mid + MS_PER_HOUR,
        totalPrice: 25,
        status: "Pending",
        createdAt: mid,
      });
      await ctx.db.insert("bookings", {
        courtId: cid,
        playerId: pid,
        startTime: mid + 2 * MS_PER_HOUR,
        endTime: mid + 3 * MS_PER_HOUR,
        totalPrice: 50,
        status: "Confirmed",
        createdAt: mid,
      });
      return oid;
    });

    const stats = await t.withIdentity({ subject: ownerId }).query(
      api.owners.queries.getOwnerStats,
      { rangeStart, rangeEnd },
    );
    expect(stats.courtCount).toBe(1);
    expect(stats.bookingsPending).toBe(1);
    expect(stats.bookingsConfirmed).toBe(1);
    expect(stats.revenueConfirmed).toBe(50);
  });
});
