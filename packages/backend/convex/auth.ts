import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
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
      ctx: any,
      { userId }: { userId: string },
    ): Promise<void> {
      const role: UserRole = "PLAYER";
      await upsertUserRecord(ctx, userId as any, role);
    },
  },
});

