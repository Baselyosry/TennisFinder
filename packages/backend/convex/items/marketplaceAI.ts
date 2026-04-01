import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const env = process.env as { AI_API_URL?: string };

const AI_FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Canonical labels stored on items; matches Python /label `status` / `label`. */
function normalizeAiLabelFromResponse(body: Record<string, unknown>): string {
  const raw =
    (typeof body.status === "string" && body.status) ||
    (typeof body.label === "string" && body.label) ||
    "";
  const s = raw.trim().toLowerCase();
  if (s === "fair" || s === "overpriced" || s === "underpriced") {
    return s;
  }
  return "AI Offline";
}

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
  returns: v.number(),
  handler: async (_ctx, args) => {
    const baseUrl = env.AI_API_URL;
    if (!baseUrl) {
      throw new Error("AI_API_URL is not set in Convex Dashboard");
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${baseUrl}/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        },
        AI_FETCH_TIMEOUT_MS,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`AI predict unreachable or timed out: ${message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API Error: ${errorText}`);
    }

    const data = (await response.json()) as { predicted_sold_price?: number };
    if (typeof data.predicted_sold_price !== "number") {
      throw new Error("AI predict returned invalid payload");
    }
    return data.predicted_sold_price;
  },
});

export const evaluateFairness = action({
  args: {
    predicted_sold_price: v.number(),
    user_price: v.number(),
  },
  returns: v.object({
    status: v.string(),
    label: v.string(),
    recommendedPriceRange: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const baseUrl = env.AI_API_URL;
    if (!baseUrl) {
      throw new Error("AI_API_URL is not set in Convex Dashboard");
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${baseUrl}/label`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        },
        AI_FETCH_TIMEOUT_MS,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`AI label unreachable or timed out: ${message}`);
    }

    if (!response.ok) {
      throw new Error("Fairness check failed");
    }

    const data = (await response.json()) as Record<string, unknown>;
    const status = normalizeAiLabelFromResponse(data);
    const label =
      typeof data.label === "string"
        ? data.label
        : typeof data.status === "string"
          ? data.status
          : status;
    const recommendedPriceRange =
      typeof data.recommendedPriceRange === "string"
        ? data.recommendedPriceRange
        : typeof data["Recommended Price Range"] === "string"
          ? (data["Recommended Price Range"] as string)
          : undefined;

    return {
      status,
      label,
      recommendedPriceRange,
    };
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
    images: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.object({
    itemId: v.id("items"),
    predicted_sold_price: v.number(),
    ai_label: v.string(),
    success: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    itemId: Id<"items">;
    predicted_sold_price: number;
    ai_label: string;
    success: boolean;
  }> => {
    const baseUrl = env.AI_API_URL;

    let predicted_sold_price = 0;
    let ai_label = "AI Offline";

    if (baseUrl) {
      try {
        const predictRes = await fetchWithTimeout(
          `${baseUrl}/predict`,
          {
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
          },
          AI_FETCH_TIMEOUT_MS,
        );

        if (predictRes.ok) {
          const predictData = (await predictRes.json()) as {
            predicted_sold_price?: number;
          };
          if (typeof predictData.predicted_sold_price === "number") {
            predicted_sold_price = predictData.predicted_sold_price;
          }

          const labelRes = await fetchWithTimeout(
            `${baseUrl}/label`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                predicted_sold_price,
                user_price: args.user_price,
              }),
            },
            AI_FETCH_TIMEOUT_MS,
          );

          if (labelRes.ok) {
            const labelData = (await labelRes.json()) as Record<string, unknown>;
            const normalized = normalizeAiLabelFromResponse(labelData);
            if (normalized !== "AI Offline") {
              ai_label = normalized;
            }
          }
        }
      } catch (error) {
        console.error("AI Service Error:", error);
      }
    }

    const itemId: Id<"items"> = await ctx.runMutation(
      api.items.mutations.create,
      {
      ...args,
      predicted_sold_price,
      ai_label,
    },
    );

    return {
      itemId,
      predicted_sold_price,
      ai_label,
      success: true,
    };
  },
});
