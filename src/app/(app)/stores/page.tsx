import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoresView } from "@/components/stores-view";

export default async function StoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HQ_ADMIN") redirect("/dashboard");

  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });

  return <StoresView stores={stores} />;
}
