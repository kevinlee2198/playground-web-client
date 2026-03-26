import { redirect } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  redirect({ href: "/settings/display", locale });
}
