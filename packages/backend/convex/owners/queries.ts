import { query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";

function rangeOverlapsBooking(
  rangeStart: number,
  rangeEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return bStart < rangeEnd && bEnd > rangeStart;
}

export const getOwnerStats = query({
  args: {
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  returns: v.object({
    courtCount: v.number(),
    bookingsPending: v.number(),
    bookingsConfirmed: v.number(),
    bookingsCancelled: v.number(),
    revenueConfirmed: v.number(),
  }),
  handler: async (ctx, { rangeStart, rangeEnd }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "COURT_OWNER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only court owners can view owner stats",
      });
    }

    if (rangeEnd <= rangeStart) {
      throw new ConvexError({
        code: "INVALID_RANGE",
        message: "rangeEnd must be after rangeStart",
      });
    }

    const courts = await ctx.db
      .query("courts")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    let bookingsPending = 0;
    let bookingsConfirmed = 0;
    let bookingsCancelled = 0;
    let revenueConfirmed = 0;

    for (const court of courts) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_court_and_time", (q) => q.eq("courtId", court._id))
        .collect();

      for (const b of bookings) {
        if (
          !rangeOverlapsBooking(
            rangeStart,
            rangeEnd,
            b.startTime,
            b.endTime,
          )
        ) {
          continue;
        }
        if (b.status === "Pending") bookingsPending += 1;
        else if (b.status === "Confirmed") {
          bookingsConfirmed += 1;
          revenueConfirmed += b.totalPrice;
        } else if (b.status === "Cancelled") bookingsCancelled += 1;
      }
    }

    return {
      courtCount: courts.length,
      bookingsPending,
      bookingsConfirmed,
      bookingsCancelled,
      revenueConfirmed,
    };
  },
});
