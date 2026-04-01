import { mutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";

export const createCourt = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    location: v.object({ lat: v.number(), lng: v.number() }),
    surfaceType: v.string(),
    pricePerHour: v.number(),
    amenities: v.optional(v.any()),
    availabilitySchedule: v.optional(v.any()),
  },
  returns: v.id("courts"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "COURT_OWNER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only court owners can create courts",
      });
    }
    if (args.pricePerHour < 0) {
      throw new ConvexError({
        code: "INVALID_PRICE",
        message: "pricePerHour must be non-negative",
      });
    }
    return await ctx.db.insert("courts", {
      ownerId: userId,
      name: args.name,
      address: args.address,
      location: args.location,
      surfaceType: args.surfaceType,
      pricePerHour: args.pricePerHour,
      amenities: args.amenities,
      availabilitySchedule: args.availabilitySchedule,
      createdAt: Date.now(),
    });
  },
});

const courtPatchValidator = v.object({
  name: v.optional(v.string()),
  address: v.optional(v.string()),
  location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  surfaceType: v.optional(v.string()),
  pricePerHour: v.optional(v.number()),
  amenities: v.optional(v.any()),
  availabilitySchedule: v.optional(v.any()),
  rating: v.optional(v.number()),
});

export const updateCourt = mutation({
  args: {
    courtId: v.id("courts"),
    patch: courtPatchValidator,
  },
  returns: v.null(),
  handler: async (ctx, { courtId, patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    const court = await ctx.db.get(courtId);
    if (!court) {
      throw new ConvexError({
        code: "COURT_NOT_FOUND",
        message: "Court not found",
      });
    }
    if (court.ownerId !== userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the owner can update this court",
      });
    }
    if (patch.pricePerHour !== undefined && patch.pricePerHour < 0) {
      throw new ConvexError({
        code: "INVALID_PRICE",
        message: "pricePerHour must be non-negative",
      });
    }
    await ctx.db.patch(courtId, patch);
    return null;
  },
});

export const deleteCourt = mutation({
  args: { courtId: v.id("courts") },
  returns: v.null(),
  handler: async (ctx, { courtId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    const court = await ctx.db.get(courtId);
    if (!court) {
      throw new ConvexError({
        code: "COURT_NOT_FOUND",
        message: "Court not found",
      });
    }
    if (court.ownerId !== userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the owner can delete this court",
      });
    }

    const anyBooking = await ctx.db
      .query("bookings")
      .withIndex("by_court_and_time", (q) => q.eq("courtId", courtId))
      .first();

    if (anyBooking !== null) {
      throw new ConvexError({
        code: "COURT_HAS_BOOKINGS",
        message:
          "Cannot delete a court that has any bookings; remove booking history first",
      });
    }

    await ctx.db.delete(courtId);
    return null;
  },
});
