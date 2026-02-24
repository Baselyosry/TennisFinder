import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const resetAndSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Clean up existing data (Optional - use with caution)
    const existingCourts = await ctx.db.query("courts").collect();
    for (const court of existingCourts) {
      await ctx.db.delete(court._id);
    }

    // 2. Create a Mock Court Owner
    // Note: In a real app, this happens via Auth. 
    // Here we seed a user to act as the owner.
    const ownerId = await ctx.db.insert("users", {
      firstName: "Admin",
      lastName: "Owner",
      email: "owner@tennisfinder.com",
      role: "COURT_OWNER",
      joinedAt: Date.now(),
      playReadinessScore: 100,
    });

    // 3. Create Mock Courts
    const courtsToSeed = [
      {
        name: "Center Court - Clay",
        address: "123 Tennis Lane, Cairo",
        location: { lat: 30.0444, lng: 31.2357 },
        surfaceType: "Clay",
        pricePerHour: 200,
        createdAt: Date.now(),
      },
      {
        name: "Grand Slam Arena",
        address: "456 Padel St, Giza",
        location: { lat: 29.9765, lng: 31.1313 },
        surfaceType: "Hard",
        pricePerHour: 350,
        createdAt: Date.now(),
      },
      {
        name: "Riverside Grass Court",
        address: "789 Zamalek Dr, Cairo",
        location: { lat: 30.0595, lng: 31.2219 },
        surfaceType: "Grass",
        pricePerHour: 500,
        createdAt: Date.now(),
      },
    ];

    for (const court of courtsToSeed) {
      await ctx.db.insert("courts", {
        ...court,
        ownerId: ownerId,
        rating: 5,
      });
    }

    return "Database Seeded Successfully!";
  },
});