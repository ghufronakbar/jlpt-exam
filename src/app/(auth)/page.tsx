import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// No Request-time API is guaranteed to run before the count(User) check below,
// so this must be forced dynamic — otherwise Next.js would bake the build-time
// user count into a static page, permanently misrouting every visitor.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    redirect("/first-time-setup");
  }

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
