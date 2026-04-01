import { mutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function hoursBetweenMs(startMs: number, endMs: number): number {
  return (endMs - startMs) / (1000 * 60 * 60);
}

/**
 * Player requests a reservation. Fails atomically if the slot overlaps an existing
 * Pending or Confirmed booking on the same court.
 */
export const createBooking = mutation({
  args: {
    courtId: v.id("courts"),
    startTime: v.number(),
    endTime: v.number(),
  },
  returns: v.id("bookings"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const playerId = identity.subject as Id<"users">;

    if (args.endTime <= args.startTime) {
      throw new ConvexError({
        code: "INVALID_RANGE",
        message: "endTime must be after startTime",
      });
    }

    const court = await ctx.db.get(args.courtId);
    if (!court) {
      throw new ConvexError({ code: "COURT_NOT_FOUND", message: "Court not found" });
    }

    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_court_and_time", (q) => q.eq("courtId", args.courtId))
      .collect();

    for (const b of existing) {
      if (b.status === "Cancelled") continue;
      if (
        intervalsOverlap(
          args.startTime,
          args.endTime,
          b.startTime,
          b.endTime,
        )
      ) {
        throw new ConvexError({
          code: "BOOKING_CONFLICT",
          message: "This court is already reserved for that time.",
        });
      }
    }

    const hours = hoursBetweenMs(args.startTime, args.endTime);
    const totalPrice = hours * court.pricePerHour;

    return await ctx.db.insert("bookings", {
      courtId: args.courtId,
      playerId,
      startTime: args.startTime,
      endTime: args.endTime,
      totalPrice,
      status: "Pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Court owner confirms a pending booking, or owner/player cancels.
 * — Confirm: only court owner, booking must be Pending.
 * — Cancel: court owner (any non-cancelled) or booking player (Pending only).
 */
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(v.literal("Confirmed"), v.literal("Cancelled")),
    cancellationReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { bookingId, status, cancellationReason }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;

    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new ConvexError({
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
      });
    }

    if (booking.status === "Cancelled") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: "Booking is already cancelled",
      });
    }

    const court = await ctx.db.get(booking.courtId);
    if (!court) {
      throw new ConvexError({
        code: "COURT_NOT_FOUND",
        message: "Court not found",
      });
    }

    const isOwner = court.ownerId === userId;
    const isPlayer = booking.playerId === userId;

    if (status === "Confirmed") {
      if (!isOwner) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Only the court owner can confirm bookings",
        });
      }
      if (booking.status !== "Pending") {
        throw new ConvexError({
          code: "INVALID_STATUS",
          message: "Only pending bookings can be confirmed",
        });
      }

      const existing = await ctx.db
        .query("bookings")
        .withIndex("by_court_and_time", (q) =>
          q.eq("courtId", booking.courtId),
        )
        .collect();

      for (const b of existing) {
        if (b._id === bookingId) continue;
        if (b.status !== "Confirmed") continue;
        if (
          intervalsOverlap(
            booking.startTime,
            booking.endTime,
            b.startTime,
            b.endTime,
          )
        ) {
          throw new ConvexError({
            code: "BOOKING_CONFLICT",
            message: "Another confirmed booking already occupies this slot.",
          });
        }
      }

      await ctx.db.patch(bookingId, { status: "Confirmed" });
      return null;
    }

    // Cancel
    if (!isOwner && !(isPlayer && booking.status === "Pending")) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You cannot cancel this booking",
      });
    }

    await ctx.db.patch(bookingId, {
      status: "Cancelled",
      cancellationReason,
    });
    return null;
  },
});
