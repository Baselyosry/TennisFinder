import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const itemPatchValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  condition: v.optional(v.string()),
  brand: v.optional(v.string()),
  model: v.optional(v.string()),
  flaw: v.optional(v.string()),
  age_months: v.optional(v.number()),
  original_price: v.optional(v.number()),
  user_price: v.optional(v.number()),
  images: v.optional(v.array(v.id("_storage"))),
});

/**
 * Create a new marketplace item. Requires authentication.
 * Sets ownerId from the authenticated user, status to "Available", createdAt to now.
 */
export const create = mutation({
  args: {
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
    images: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const ownerId = identity.subject as Id<"users">;
    const now = Date.now();
    return await ctx.db.insert("items", {
      ownerId,
      title: args.title,
      description: args.description,
      category: args.category,
      condition: args.condition,
      brand: args.brand,
      model: args.model,
      flaw: args.flaw,
      age_months: args.age_months,
      original_price: args.original_price,
      user_price: args.user_price,
      images: args.images,
      status: "Available",
      createdAt: now,
    });
  },
});

/**
 * Update an item by id. Only the owner can update.
 */
export const update = mutation({
  args: {
    itemId: v.id("items"),
    patch: itemPatchValidator,
  },
  returns: v.null(),
  handler: async (ctx, { itemId, patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    const ownerId = identity.subject as Id<"users">;
    if (item.ownerId !== ownerId) {
      throw new Error("Unauthorized: you are not the owner of this item");
    }
    await ctx.db.patch(itemId, patch);
    return null;
  },
});

/**
 * Remove an item. Only the owner can delete.
 */
export const remove = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    const ownerId = identity.subject as Id<"users">;
    if (item.ownerId !== ownerId) {
      throw new Error("Unauthorized: you are not the owner of this item");
    }
    await ctx.db.delete(itemId);
    return null;
  },
});

/**
 * Toggle item status between "Available" and "Sold". Only the owner can toggle.
 */
export const toggleStatus = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    const ownerId = identity.subject as Id<"users">;
    if (item.ownerId !== ownerId) {
      throw new Error("Unauthorized: you are not the owner of this item");
    }
    const nextStatus = item.status === "Available" ? "Sold" : "Available";
    await ctx.db.patch(itemId, { status: nextStatus });
    return null;
  },
});
