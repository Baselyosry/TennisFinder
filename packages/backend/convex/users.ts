import type { GenericMutationCtx } from "convex/server";
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";

export type UserRole = "PLAYER" | "COURT_OWNER" | "ADMIN";

const roleValidator = v.union(
  v.literal("PLAYER"),
  v.literal("COURT_OWNER"),
  v.literal("ADMIN"),
);

/**
 * Internal helper to ensure a user has the correct role and joinedAt fields.
 * This is used both by the internalMutation below and by Convex Auth callbacks.
 */
export async function upsertUserRecord(
  ctx: GenericMutationCtx<DataModel>,
  userId: Id<"users">,
  role: UserRole,
): Promise<void> {
  const user: Doc<"users"> | null = await ctx.db.get(userId);

  // The Convex Auth library is responsible for creating user documents.
  // If the user doesn't exist yet, there's nothing for us to update.
  if (!user) {
    return;
  }

  const patch: Record<string, unknown> = {};
  const now = Date.now();

  if (user.role !== role) {
    patch.role = role;
  }

  if (user.joinedAt == null) {
    patch.joinedAt = now;
  }

  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(userId, patch);
  }
}

export const upsertUser = internalMutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, { userId, role }) => {
    await upsertUserRecord(ctx, userId, role);
    return null;
  },
});

const locationValidator = v.object({ lat: v.number(), lng: v.number() });

const syncProfilePatchValidator = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),
  gender: v.optional(v.string()),
  skillLevel: v.optional(v.number()),
  preferredTimes: v.optional(v.any()),
  location: v.optional(locationValidator),
});

/**
 * Authenticated user updates their own profile fields (no role changes here).
 */
export const syncProfile = mutation({
  args: { patch: syncProfilePatchValidator },
  returns: v.null(),
  handler: async (ctx, { patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(userId, patch);
    return null;
  },
});

/**
 * Authenticated user sets their own role (e.g. after onboarding).
 */
export const updateRole = mutation({
  args: { role: roleValidator },
  returns: v.null(),
  handler: async (ctx, { role }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject as Id<"users">;
    await upsertUserRecord(ctx, userId, role);
    return null;
  },
});

