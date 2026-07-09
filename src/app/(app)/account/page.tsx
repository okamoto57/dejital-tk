import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PasswordChangeForm } from "@/components/password-change-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <PasswordChangeForm userName={session.user.name ?? ""} userEmail={session.user.email ?? ""} />;
}
