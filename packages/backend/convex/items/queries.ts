import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db.get(identity.subject as Id<"users">);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: admin only");
    }
    return await ctx.db.query("items").order("desc").collect();
  },
});

/**
 * Paginated "Available" listings with optional category, price bounds, and AI label.
 * Uses indexes; when `aiLabel` is set, applies an additional equality filter on `ai_label`.
 */
export const listAvailableFiltered = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    aiLabel: v.optional(v.string()),
  },
  returns: paginationResultValidator(itemDocValidator),
  handler: async (ctx, args) => {
    const { paginationOpts, category, minPrice, maxPrice, aiLabel } = args;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new Error("minPrice cannot exceed maxPrice");
    }

    const hasCat = category !== undefined && category.length > 0;
    const hasMin = minPrice !== undefined;
    const hasMax = maxPrice !== undefined;
    const hasLabel = aiLabel !== undefined && aiLabel.length > 0;

    if (hasCat && (hasMin || hasMax)) {
      let q = ctx.db
        .query("items")
        .withIndex("by_status_and_category_and_user_price", (iq) => {
          const base = iq.eq("status", "Available").eq("category", category!);
          if (hasMin) {
            return base.gte("user_price", minPrice!);
          }
          if (hasMax) {
            return base.lte("user_price", maxPrice!);
          }
          return base;
        });
      if (hasMax && hasMin) {
        q = q.filter((fq) => fq.lte(fq.field("user_price"), maxPrice!));
      }
      if (hasLabel) {
        q = q.filter((fq) => fq.eq(fq.field("ai_label"), aiLabel!));
      }
      return await q.order("asc").paginate(paginationOpts);
    }

    if (hasCat) {
      let q = ctx.db
        .query("items")
        .withIndex("by_status_and_category_and_createdAt", (iq) =>
          iq.eq("status", "Available").eq("category", category!),
        );
      if (hasLabel) {
        q = q.filter((fq) => fq.eq(fq.field("ai_label"), aiLabel!));
      }
      return await q.order("desc").paginate(paginationOpts);
    }

    if (hasMin || hasMax) {
      let q = ctx.db
        .query("items")
        .withIndex("by_status_and_user_price", (iq) => {
          const base = iq.eq("status", "Available");
          if (hasMin) {
            return base.gte("user_price", minPrice!);
          }
          if (hasMax) {
            return base.lte("user_price", maxPrice!);
          }
          return base;
        });
      if (hasMax && hasMin) {
        q = q.filter((fq) => fq.lte(fq.field("user_price"), maxPrice!));
      }
      if (hasLabel) {
        q = q.filter((fq) => fq.eq(fq.field("ai_label"), aiLabel!));
      }
      return await q.order("asc").paginate(paginationOpts);
    }

    let q = ctx.db
      .query("items")
      .withIndex("by_status_and_createdAt", (iq) =>
        iq.eq("status", "Available"),
      );
    if (hasLabel) {
      q = q.filter((fq) => fq.eq(fq.field("ai_label"), aiLabel!));
    }
    return await q.order("desc").paginate(paginationOpts);
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
