import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessibleStores } from "@/lib/access";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const stores = await getAccessibleStores(session);

  return (
    <ThemeProvider>
      <AppShell role={session.user.role} stores={stores} userName={session.user.name ?? session.user.email ?? ""}>
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
