import { Link } from "@/i18n/navigation";
import { useNow, useTranslations } from "next-intl";
import { TypographyMuted } from "../ui/typography";

function MeadowWave() {
  return (
    <div className="text-secondary" aria-hidden="true">
      <svg
        viewBox="0 0 1440 32"
        fill="currentColor"
        preserveAspectRatio="none"
        className="block h-4 w-full sm:h-6"
      >
        <path d="M0 24C200 10 400 32 600 20S1000 4 1200 20S1380 32 1440 24V32H0Z" />
      </svg>
    </div>
  );
}

const FOOTER_LINKS = [
  { href: "/resources/get-started", labelKey: "footer.gettingStarted" },
  { href: "/stat-tracking", labelKey: "footer.statTracking" },
  { href: "/pricing", labelKey: "footer.pricing" },
  { href: "/resource/about", labelKey: "footer.about" },
  { href: "/resource/contact", labelKey: "footer.contact" },
  {
    href: "/resource/frequently-asked-questions",
    labelKey: "footer.faq",
  },
] as const;

export default function Footer() {
  const t = useTranslations();
  const now = useNow();

  return (
    <footer className="mt-auto">
      <MeadowWave />

      <div className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-6 py-3 sm:flex-row sm:justify-between sm:gap-4">
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-1 gap-y-0.5 sm:order-1">
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.href} className="flex items-center gap-1">
                {i > 0 && (
                  <span
                    className="text-muted-foreground/40 text-xs select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-primary focus-visible:text-primary focus-visible:underline focus-visible:outline-none py-2 text-xs transition-colors sm:py-0.5"
                >
                  {t(link.labelKey)}
                </Link>
              </span>
            ))}
          </nav>

          <TypographyMuted className="shrink-0 text-xs sm:order-2">
            {t("footer.allRightsReserved", { currentDate: now })}
          </TypographyMuted>
        </div>
      </div>
    </footer>
  );
}
