import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { convexTestModules } from "../../convexTestModules";
import { expectConvexErrorCode } from "./helpers";

const MS_PER_HOUR = 60 * 60 * 1000;

/** Fixed calendar day so slot boundaries are stable in tests. */
function dayStartMs(): number {
  return new Date("2026-06-15T00:00:00.000Z").getTime();
}

type Seed = {
  ownerId: Id<"users">;
  playerAId: Id<"users">;
  playerBId: Id<"users">;
  courtId: Id<"courts">;
};

async function seedCourtAndUsers(
  t: ReturnType<typeof convexTest>,
): Promise<Seed> {
  return t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner@example.com",
      name: "Owner",
    });
    const playerAId = await ctx.db.insert("users", {
      email: "a@example.com",
      name: "User A",
    });
    const playerBId = await ctx.db.insert("users", {
      email: "b@example.com",
      name: "User B",
    });
    const courtId = await ctx.db.insert("courts", {
      ownerId,
      name: "Court 1",
      address: "1 Tennis Way",
      location: { lat: 0, lng: 0 },
      surfaceType: "hard",
      pricePerHour: 40,
      createdAt: 0,
    });
    return { ownerId, playerAId, playerBId, courtId };
  });
}

describe("bookings", () => {
  it("createBooking: successful reservation is Pending or Confirmed", async () => {
    const t = convexTest(schema, convexTestModules);
    const { playerAId, courtId } = await seedCourtAndUsers(t);
    const day = dayStartMs();
    const start = day + 10 * MS_PER_HOUR;
    const end = day + 11 * MS_PER_HOUR;

    const bookingId = await t.withIdentity({ subject: playerAId }).mutation(
      api.bookings.mutations.createBooking,
      { courtId, startTime: start, endTime: end },
    );

    const row = await t.run(async (ctx) => ctx.db.get(bookingId));
    expect(row).not.toBeNull();
    expect(row?.status === "Pending" || row?.status === "Confirmed").toBe(
      true,
    );
  });

  it("createBooking: overlapping slot throws ConvexError BOOKING_CONFLICT", async () => {
    const t = convexTest(schema, convexTestModules);
    const { playerAId, playerBId, courtId } = await seedCourtAndUsers(t);
    const day = dayStartMs();
    const aStart = day + 14 * MS_PER_HOUR;
    const aEnd = day + 15 * MS_PER_HOUR;
    const bStart = day + 14.5 * MS_PER_HOUR;
    const bEnd = day + 15.5 * MS_PER_HOUR;

    await t.withIdentity({ subject: playerAId }).mutation(
      api.bookings.mutations.createBooking,
      { courtId, startTime: aStart, endTime: aEnd },
    );

    try {
      await t.withIdentity({ subject: playerBId }).mutation(
        api.bookings.mutations.createBooking,
        { courtId, startTime: bStart, endTime: bEnd },
      );
      expect.fail("expected BOOKING_CONFLICT");
    } catch (err) {
      expectConvexErrorCode(err, "BOOKING_CONFLICT");
    }
  });

  it("updateBookingStatus: non-owner cannot cancel another user's booking", async () => {
    const t = convexTest(schema, convexTestModules);
    const { playerAId, playerBId, courtId } = await seedCourtAndUsers(t);
    const day = dayStartMs();
    const start = day + 9 * MS_PER_HOUR;
    const end = day + 10 * MS_PER_HOUR;

    const bookingId = await t.withIdentity({ subject: playerAId }).mutation(
      api.bookings.mutations.createBooking,
      { courtId, startTime: start, endTime: end },
    );

    try {
      await t.withIdentity({ subject: playerBId }).mutation(
        api.bookings.mutations.updateBookingStatus,
        { bookingId, status: "Cancelled" },
      );
      expect.fail("expected FORBIDDEN");
    } catch (err) {
      expectConvexErrorCode(err, "FORBIDDEN");
    }
  });

  it("listAvailability: hides 14:00–15:00 after that window is booked", async () => {
    const t = convexTest(schema, convexTestModules);
    const { playerAId, courtId } = await seedCourtAndUsers(t);
    const day = dayStartMs();
    const rangeStart = day;
    const rangeEnd = day + 24 * MS_PER_HOUR;
    const slot14 = day + 14 * MS_PER_HOUR;
    const slot15 = day + 15 * MS_PER_HOUR;

    const before = await t.query(api.bookings.queries.listAvailability, {
      courtId,
      rangeStart,
      rangeEnd,
      slotDurationMs: MS_PER_HOUR,
    });
    const slotBefore = before.find(
      (s) => s.startTime === slot14 && s.endTime === slot15,
    );
    expect(slotBefore?.available).toBe(true);

    await t.withIdentity({ subject: playerAId }).mutation(
      api.bookings.mutations.createBooking,
      {
        courtId,
        startTime: slot14,
        endTime: slot15,
      },
    );

    const after = await t.query(api.bookings.queries.listAvailability, {
      courtId,
      rangeStart,
      rangeEnd,
      slotDurationMs: MS_PER_HOUR,
    });
    const slotAfter = after.find(
      (s) => s.startTime === slot14 && s.endTime === slot15,
    );
    expect(slotAfter?.available).toBe(false);
  });
});
