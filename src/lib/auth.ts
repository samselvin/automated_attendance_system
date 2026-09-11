import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { isAllowedDomain, isBootstrapAdminEmail } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !profile) return false;

      const email = (profile.email as string | undefined)?.toLowerCase();
      const emailVerified = profile.email_verified as boolean | undefined;
      const googleSub = profile.sub as string | undefined;
      const hostedDomain = profile.hd as string | undefined;

      if (!email || !googleSub) return false;
      if (emailVerified === false) return false;

      const bootstrapException = isBootstrapAdminEmail(email);
      const domainAllowed = isAllowedDomain(email);

      if (!domainAllowed && !bootstrapException) {
        return false; // AccessDenied → login page shows "not registered" message
      }

      // For a genuine college-domain Workspace account, cross-check the
      // hosted-domain claim when Google supplies one — the bootstrap
      // exception is for a personal address, so it never carries `hd`.
      if (domainAllowed && hostedDomain) {
        const emailDomain = email.split("@")[1];
        if (hostedDomain.toLowerCase() !== emailDomain) return false;
      }

      // No self-registration: the user must already exist (created by Admin
      // or import). Match by Google account id first, then by email.
      const existing = await prisma.user.findFirst({
        where: { OR: [{ googleSub }, { email }] },
      });

      if (!existing || existing.status !== "ACTIVE") {
        return false;
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleSub,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      if (bootstrapException && !domainAllowed) {
        await writeAuditLog({
          actorUserId: existing.id,
          actorRole: "ADMIN",
          action: "BOOTSTRAP_ADMIN_LOGIN",
          entityType: "User",
          entityId: existing.id,
          context: { email, note: "Login via non-domain bootstrap admin exception" },
        });
      }

      user.id = existing.id;
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      const userId = token.userId;
      if (!userId) {
        session.user.isActive = false;
        session.user.roles = [];
        session.user.teacherId = null;
        session.user.studentId = null;
        session.user.isBootstrapAdmin = false;
        return session;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: { where: { status: "ACTIVE" } },
          teacher: true,
          student: true,
        },
      });

      if (!dbUser || dbUser.status !== "ACTIVE") {
        session.user.isActive = false;
        session.user.roles = [];
        session.user.teacherId = null;
        session.user.studentId = null;
        session.user.isBootstrapAdmin = false;
        return session;
      }

      session.user.id = dbUser.id;
      session.user.email = dbUser.email;
      session.user.isActive = true;
      session.user.roles = dbUser.roles.map((r) => ({
        role: r.role,
        departmentId: r.departmentId,
      }));
      session.user.teacherId = dbUser.teacher?.id ?? null;
      session.user.studentId = dbUser.student?.id ?? null;
      session.user.isBootstrapAdmin = dbUser.isBootstrapAdmin;

      return session;
    },
  },
});
