import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ResultLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 p-4">{children}</div>;
}
