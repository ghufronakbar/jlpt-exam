import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/features/auth/components/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Must be forced dynamic: the count(User) === 0 guard is a security check
// (registration must close after the first user exists), so it can never be
// allowed to run once at build time and get cached as a static page.
export const dynamic = "force-dynamic";

export default async function FirstTimeSetupPage() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Setup Akun Pertama</CardTitle>
        <CardDescription>
          Registrasi hanya bisa dilakukan sekali, khusus pemilik aplikasi ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
