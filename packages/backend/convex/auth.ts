import type { AnyDataModel, GenericMutationCtx } from "convex/server";
import type { GenericId } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { DataModel, Id } from "./_generated/dataModel";
import { upsertUserRecord, type UserRole } from "./users";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    /**
     * Ensure new or updated users get a TennisFinder role and joinedAt timestamp.
     *
     * For now we default everyone to "PLAYER". Later we'll extend this to accept
     * a role from the frontend or from the auth profile.
     */
    async afterUserCreatedOrUpdated(
      ctx: GenericMutationCtx<AnyDataModel>,
      args: {
        userId: GenericId<"users">;
        existingUserId: GenericId<"users"> | null;
        type: "oauth" | "credentials" | "email" | "phone" | "verification";
        provider: unknown;
        profile: Record<string, unknown> & {
          email?: string;
          phone?: string;
          emailVerified?: boolean;
          phoneVerified?: boolean;
        };
        shouldLink?: boolean;
      },
    ): Promise<void> {
      const role: UserRole = "PLAYER";
      await upsertUserRecord(
        ctx as GenericMutationCtx<DataModel>,
        args.userId as Id<"users">,
        role,
      );
    },
  },
});

