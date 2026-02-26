import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const itemDocValidator = v.object({
  _id: v.id("items"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  title: v.string(),
  description: v.string(),
  category: v.string(),
  condition: v.string(),
  brand: v.string(),
  model: v.string(),
  flaw: v.string(),
  age_months: v.number(),
  original_price: v.number(),
  user_price: v.number(),
  predicted_sold_price: v.optional(v.number()),
  ai_label: v.optional(v.string()),
  images: v.optional(v.array(v.id("_storage"))),
  status: v.union(v.literal("Available"), v.literal("Sold")),
  createdAt: v.number(),
});

/**
 * Returns all items with status "Available", newest first.
 */
export const listAvailable = query({
  args: {},
  returns: v.array(itemDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("items")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", "Available"),
      )
      .order("desc")
      .collect();
  },
});

/**
 * Returns only items belonging to the currently authenticated user.
 */
export const listMyItems = query({
  args: {},
  returns: v.array(itemDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const ownerId = identity.subject as Id<"users">;
    return await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
  },
});

/**
 * Returns every item in the table (for Admin/Professor view).
 */
export const listAll = query({
  args: {},
  returns: v.array(itemDocValidator),
  handler: async (ctx) => {
    return await ctx.db.query("items").order("desc").collect();
  },
});

/**
 * Fetches a single item by id. Returns null if not found.
 */
export const getById = query({
  args: { itemId: v.id("items") },
  returns: v.union(itemDocValidator, v.null()),
  handler: async (ctx, { itemId }) => {
    return await ctx.db.get(itemId);
  },
});
