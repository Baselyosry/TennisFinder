import { query } from "../_generated/server";
import { v } from "convex/values";

const bookingDocValidator = v.object({
  _id: v.id("bookings"),
  _creationTime: v.number(),
  courtId: v.id("courts"),
  playerId: v.id("users"),
  startTime: v.number(),
  endTime: v.number(),
  totalPrice: v.number(),
  status: v.union(
    v.literal("Pending"),
    v.literal("Confirmed"),
    v.literal("Cancelled"),
  ),
  createdAt: v.number(),
  cancellationReason: v.optional(v.string()),
});

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Bookings for a court whose interval overlaps [rangeStart, rangeEnd).
 */
export const listByCourt = query({
  args: {
    courtId: v.id("courts"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  returns: v.array(bookingDocValidator),
  handler: async (ctx, { courtId, rangeStart, rangeEnd }) => {
    if (rangeEnd <= rangeStart) {
      return [];
    }
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_court_and_time", (q) => q.eq("courtId", courtId))
      .collect();
    return rows.filter((b) =>
      intervalsOverlap(b.startTime, b.endTime, rangeStart, rangeEnd),
    );
  },
});

const slotValidator = v.object({
  startTime: v.number(),
  endTime: v.number(),
  available: v.boolean(),
});

/**
 * Fixed-duration slots between rangeStart and rangeEnd; a slot is unavailable if it
 * overlaps any non-cancelled booking on the court.
 */
export const listAvailability = query({
  args: {
    courtId: v.id("courts"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
    slotDurationMs: v.optional(v.number()),
  },
  returns: v.array(slotValidator),
  handler: async (ctx, { courtId, rangeStart, rangeEnd, slotDurationMs }) => {
    const duration = slotDurationMs ?? 60 * 60 * 1000;
    if (rangeEnd <= rangeStart || duration <= 0) {
      return [];
    }

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_court_and_time", (q) => q.eq("courtId", courtId))
      .collect();

    const blocking = rows.filter(
      (b) => b.status === "Pending" || b.status === "Confirmed",
    );

    const slots: Array<{ startTime: number; endTime: number; available: boolean }> =
      [];
    for (let t = rangeStart; t + duration <= rangeEnd; t += duration) {
      const slotStart = t;
      const slotEnd = t + duration;
      const clash = blocking.some((b) =>
        intervalsOverlap(slotStart, slotEnd, b.startTime, b.endTime),
      );
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: !clash,
      });
    }
    return slots;
  },
});
