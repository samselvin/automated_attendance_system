import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { isAllowedDomain, isBootstrapAdminEmail } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";
import { verifyPassword } from "@/lib/password";
import { isLocked, nextFailedAttemptState } from "@/lib/login-lockout";

const credentialsProvider = Credentials({
  id: "credentials",
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  // Email/password login is college-domain accounts only, with one
  // exception: an address explicitly listed in INITIAL_ADMIN_EMAILS (the
  // same allowlist used for the Google bootstrap exception) may also use a
  // password — a deliberate, per-address opt-in rather than opening
  // password login to any personal-email domain.
  async authorize(credentials) {
    const email = String(credentials?.email ?? "").trim().toLowerCase();
    const password = String(credentials?.password ?? "");
    if (!email || !password) return null;

    const domainAllowed = isAllowedDomain(email);
    const bootstrapException = isBootstrapAdminEmail(email);
    if (!domainAllowed && !bootstrapException) return null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE" || !user.passwordHash) return null;

    if (isLocked(user.lockedUntil)) {
      await writeAuditLog({
        actorUserId: user.id,
        actorRole: "UNKNOWN",
        action: "PASSWORD_LOGIN_BLOCKED_LOCKED",
        entityType: "User",
        entityId: user.id,
      });
      return null;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const next = nextFailedAttemptState(user.failedLoginAttempts);
      await prisma.user.update({ where: { id: user.id }, data: next });
      if (next.lockedUntil) {
        await writeAuditLog({
          actorUserId: user.id,
          actorRole: "UNKNOWN",
          action: "PASSWORD_LOGIN_LOCKED",
          entityType: "User",
          entityId: user.id,
          context: { lockedUntil: next.lockedUntil.toISOString() },
        });
      }
      return null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    if (bootstrapException && !domainAllowed) {
      await writeAuditLog({
        actorUserId: user.id,
        actorRole: "ADMIN",
        action: "BOOTSTRAP_ADMIN_LOGIN",
        entityType: "User",
        entityId: user.id,
        context: { email, note: "Password login via non-domain bootstrap admin exception" },
      });
    }

    return { id: user.id, email: user.email };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, credentialsProvider],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        // authorize() above already did every check (domain, status, lock,
        // password) — nothing left to verify here.
        return true;
      }

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
        session.user.mustChangePassword = false;
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
        session.user.mustChangePassword = false;
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
      session.user.mustChangePassword = dbUser.mustChangePassword;

      return session;
    },
  },
});
