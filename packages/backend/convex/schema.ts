import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Auth tables
  ...authTables,

  // Extend the Convex Auth `users` table by redefining it with the
  // original auth fields plus our domain-specific fields.
  users: defineTable({
    ...authTables.users.validator.fields,
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    skillLevel: v.optional(v.number()),
    preferredTimes: v.optional(v.any()),
    // Grouped for cleaner frontend map integration
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    role: v.optional(
      v.union(
        v.literal("PLAYER"),
        v.literal("COURT_OWNER"),
        v.literal("ADMIN"),
      ),
    ),
    lastActiveAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    playReadinessScore: v.optional(v.number()),
  }).index("by_email", ["email"]),

  courts: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    address: v.string(),
    location: v.object({ lat: v.number(), lng: v.number() }),
    surfaceType: v.string(),
    pricePerHour: v.number(),
    amenities: v.optional(v.any()),
    availabilitySchedule: v.optional(v.any()),
    rating: v.optional(v.number()), // Optional, as new courts have no rating
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  bookings: defineTable({
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
    cancellationReason: v.optional(v.string()), // Must be optional
  })
    .index("by_court_and_time", ["courtId", "startTime"])
    .index("by_player", ["playerId"]), // Added index for fetching a user's bookings

  matches: defineTable({
    creatorId: v.id("users"),
    tournamentId: v.optional(v.id("tournaments")),
    type: v.union(v.literal("Singles"), v.literal("Doubles")),
    courtId: v.optional(v.id("courts")),
    scheduledTime: v.number(),
    status: v.union(
      v.literal("Open"),
      v.literal("Full"),
      v.literal("Completed"),
      v.literal("Cancelled"),
    ),
    createdAt: v.number(),
    compatibilityScore: v.optional(v.number()), // Optional, pending AI calculation
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),

  matchParticipants: defineTable({
    matchId: v.id("matches"),
    userId: v.id("users"),
    status: v.union(
      v.literal("Pending"),
      v.literal("Accepted"),
      v.literal("Rejected"),
    ),
    joinedAt: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_user", ["userId"]), // Crucial for querying "My Matches"

  tournaments: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    gameType: v.union(v.literal("Singles"), v.literal("Doubles")),
    bracket: v.optional(v.any()),
    schedule: v.optional(v.any()),
    prizes: v.optional(v.any()),
    status: v.union(
      v.literal("Draft"),
      v.literal("Active"),
      v.literal("Completed"),
    ),
    createdAt: v.number(),
  }),

  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    joinedAt: v.number(),
    status: v.union(
      v.literal("Pending"),
      v.literal("Accepted"),
      v.literal("Rejected"),
    ),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"]),

  items: defineTable({
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
    predicted_sold_price: v.optional(v.number()), // Optional, pending AI prediction
    ai_label: v.optional(v.string()),             // Optional, pending AI evaluation
    images: v.optional(v.array(v.id("_storage"))), // Utilizing Convex File Storage
    status: v.union(v.literal("Available"), v.literal("Sold")),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  reviews: defineTable({
    reviewerId: v.id("users"),
    targetType: v.union(
      v.literal("Court"),
      v.literal("User"),
      v.literal("Item"),
    ),
    targetId: v.union(v.id("courts"), v.id("users"), v.id("items")),
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number(),
  })
    .index("by_target", ["targetId"])
    .index("by_reviewer", ["reviewerId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
    payloadJson: v.optional(v.any()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]), // Crucial for fetching a user's notification feed

  aiRecommendations: defineTable({
    forUserId: v.id("users"),
    suggestedUserIds: v.optional(v.array(v.id("users"))),
    compatibilityScores: v.optional(v.any()),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_user", ["forUserId"]),

  demandForecasts: defineTable({
    courtId: v.id("courts"),
    forecastData: v.optional(v.any()),
    recommendedPrice: v.number(),
    peakHours: v.optional(v.any()),
    modelVersion: v.string(),
    createdAt: v.number(),
  }).index("by_court", ["courtId"]),
});