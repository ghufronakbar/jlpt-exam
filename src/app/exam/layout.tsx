import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ExamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <div className="flex min-h-svh flex-col">{children}</div>;
}
