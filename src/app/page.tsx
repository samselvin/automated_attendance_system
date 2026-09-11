import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isActive) {
    redirect("/login?error=AccessDenied");
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const roles = session.user.roles.map((r) => r.role);
  if (roles.includes("ADMIN")) redirect("/admin");
  if (roles.includes("TEACHER")) redirect("/teacher");
  if (roles.includes("STUDENT")) redirect("/student");

  redirect("/login?error=AccessDenied");
}
