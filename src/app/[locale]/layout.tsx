import "@/app/globals.css";
import Footer from "@/components/playground/footer";
import { Navbar } from "@/components/playground/navbar";
import { NewGameFab } from "@/components/playground/new-game-fab";
import { ScrollDirectionProvider } from "@/components/playground/scroll-direction-provider";
import { SkipNavLink } from "@/components/playground/skip-nav-link";
import { TabBar } from "@/components/playground/tab-bar";
import { Toaster } from "@/components/ui/toast";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Nunito, Quicksand } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { JSX } from "react";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Playground",
  description: "Where friends come to play",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf3e6" },
    { media: "(prefers-color-scheme: dark)", color: "#302b22" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps): Promise<JSX.Element> {
  const [{ locale }, hdrs] = await Promise.all([params, headers()]);
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  let session = null;
  try {
    session = await auth.api.getSession({ headers: hdrs });
  } catch (error) {
    console.error("[locale-layout] Session fetch failed:", error instanceof Error ? error.message : String(error));
  }
  return (
    <html
      lang={locale}
      className={`${nunito.variable} ${quicksand.variable}`}
      style={{ colorScheme: "light dark" }}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "flex min-h-screen flex-col antialiased",
          session?.user && "pb-16 lg:pb-0",
        )}
      >
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ScrollDirectionProvider>
              <SkipNavLink />
              <Navbar />
              <TabBar />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
              <NewGameFab />
              <Toaster />
            </ScrollDirectionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
