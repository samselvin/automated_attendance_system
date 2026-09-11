import type { RoleName } from "@prisma/client";

export interface SessionRole {
  role: RoleName;
  departmentId: string | null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isActive: boolean;
      roles: SessionRole[];
      teacherId: string | null;
      studentId: string | null;
      isBootstrapAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}

// `next-auth/jwt` re-exports `@auth/core/jwt`'s `JWT` interface rather than
// declaring its own, so callback signatures inside `next-auth` resolve the
// type from the original module — augment that one too.
declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}
