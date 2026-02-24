import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export type UserRole = "PLAYER" | "COURT_OWNER" | "ADMIN";

/**
 * Internal helper to ensure a user has the correct role and joinedAt fields.
 * This is used both by the internalMutation below and by Convex Auth callbacks.
 */
export async function upsertUserRecord(
  ctx: {
    db: {
      get: (id: Id<"users">) => Promise<any>;
      patch: (id: Id<"users">, value: Record<string, unknown>) => Promise<void>;
    };
  },
  userId: Id<"users">,
  role: UserRole,
) {
  const user = await ctx.db.get(userId);

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
    role: v.union(
      v.literal("PLAYER"),
      v.literal("COURT_OWNER"),
      v.literal("ADMIN"),
    ),
  },
  handler: async (ctx, { userId, role }) => {
    await upsertUserRecord(ctx, userId, role);
  },
});

