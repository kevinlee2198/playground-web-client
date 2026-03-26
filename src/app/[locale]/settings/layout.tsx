import { fetchCurrentUser } from "@/components/auth/actions";
import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { SettingsSidebarNav } from "./settings-sidebar-nav";

export const metadata: Metadata = {
  title: "Settings | Playground",
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps) {
  const [{ locale }, currentUser] = await Promise.all([
    params,
    fetchCurrentUser(),
  ]);

  if (!currentUser) {
    redirect({ href: "/", locale });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <SettingsSidebarNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
