import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api"; 

// This bypasses the "Cannot find name 'process'" error
const env = process.env as any; 

export const predictItemPrice = action({
  args: {
    category: v.string(),
    condition: v.string(),
    brand: v.string(),
    model: v.string(),
    flaw: v.string(),
    age_months: v.number(),
    original_price: v.number(),
  },
  handler: async (ctx, args) => {
    // Use the casted env variable
    const baseUrl = env.AI_API_URL;
    
    if (!baseUrl) {
      throw new Error("AI_API_URL is not set in Convex Dashboard");
    }

    const response = await fetch(`${baseUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.predicted_sold_price;
  },
});

export const evaluateFairness = action({
  args: {
    predicted_sold_price: v.number(),
    user_price: v.number(),
  },
  handler: async (ctx, args) => {
    // @ts-ignore
    const baseUrl = process.env.AI_API_URL;
    const response = await fetch(`${baseUrl}/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    if (!response.ok) throw new Error("Fairness check failed");
    return await response.json(); // Returns { status, recommendation, etc }
  },
});

export const autoListWithAI = action({
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
    images: v.array(v.string()),
  },
  // We add an explicit return type here to stop the "implicitly has type any" error
  handler: async (ctx, args): Promise<{
    itemId: any;
    predicted_sold_price: number;
    ai_label: string;
    success: boolean;
  }> => {
    // @ts-ignore
    const baseUrl = process.env.AI_API_URL;
    
    let predicted_sold_price = 0;
    let ai_label = "AI Offline";

    if (baseUrl) {
      try {
        const predictRes = await fetch(`${baseUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: args.category,
            condition: args.condition,
            brand: args.brand,
            model: args.model,
            flaw: args.flaw,
            age_months: args.age_months,
            original_price: args.original_price,
          }),
        });

        if (predictRes.ok) {
          const predictData = await predictRes.json();
          predicted_sold_price = predictData.predicted_sold_price;

          const labelRes = await fetch(`${baseUrl}/label`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              predicted_sold_price,
              user_price: args.user_price,
            }),
          });

          if (labelRes.ok) {
            const labelData = await labelRes.json();
            ai_label = labelData.status;
          }
        }
      } catch (error) {
        console.error("AI Service Error:", error);
      }
    }

    // Call the mutation
   // Find this section in your marketplaceAI.ts file
const itemId = await ctx.runMutation(api.items.mutations.create, {
  ...args,
  images: args.images as any, // Add 'as any' here to bypass the strict Id<"_storage"> check
  predicted_sold_price,
  ai_label,
});

    return {
      itemId,
      predicted_sold_price,
      ai_label,
      success: true
    };
  },
});