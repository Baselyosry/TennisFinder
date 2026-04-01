import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Declarable image types for upload URL issuance (client must send matching Content-Type on POST). */
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

function normalizeContentType(ct: string): string {
  return ct.trim().toLowerCase();
}

export function isAllowedDeclaredImageType(contentType: string): boolean {
  const n = normalizeContentType(contentType);
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(n);
}

function isAllowedStoredImageType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const n = normalizeContentType(contentType);
  if ((ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(n)) return true;
  return n.startsWith("image/");
}

/**
 * Validates each storage id exists and has an image/* content type after upload.
 */
export async function assertStorageIdsAreImages(
  ctx: MutationCtx,
  storageIds: Id<"_storage">[],
): Promise<void> {
  for (const id of storageIds) {
    const meta = await ctx.db.system.get("_storage", id);
    if (!meta) {
      throw new Error("Uploaded file not found");
    }
    const ct = (meta as { contentType?: string | null }).contentType;
    if (!isAllowedStoredImageType(ct)) {
      throw new Error("Only image uploads are allowed");
    }
  }
}

/**
 * Returns a short-lived POST URL for Convex File Storage.
 * Requires auth. Rejects non-image declared content types before issuing a URL.
 */
export const generateUploadUrl = mutation({
  args: {
    contentType: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, { contentType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    if (!isAllowedDeclaredImageType(contentType)) {
      throw new Error(
        "Invalid content type: allowed values are image/jpeg, image/png, image/webp, image/gif",
      );
    }
    return await ctx.storage.generateUploadUrl();
  },
});
