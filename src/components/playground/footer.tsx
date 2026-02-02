import { Link } from "@/i18n/navigation";
import { useNow, useTranslations } from "next-intl";
import { TypographyH5, TypographyP } from "../ui/typography";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-muted">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid grid-cols-4 gap-8">
          {/* Help Section */}
          <div className="text-center">
            <TypographyH5>{t("footer.help.title")}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resources/get-started">
                  <TypographyP>{t("footer.help.gettingStarted")}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Section */}
          <div className="text-center">
            <TypographyH5>{t("footer.features.title")}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/stat-tracking">
                  <TypographyP>{t("footer.features.statTracking")}</TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/pricing">
                  <TypographyP>{t("footer.features.pricing")}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Section */}
          <div className="text-center">
            <TypographyH5>{t("common.title")}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resource/about">
                  <TypographyP>{t("footer.company.about")}</TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resource/contact">
                  <TypographyP>{t("footer.company.contact")}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div className="text-center">
            <TypographyH5>{t("footer.resources.title")}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resource/privacy-policy">
                  <TypographyP>
                    {t("footer.resources.privacyPolicy")}
                  </TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resource/frequently-asked-questions">
                  <TypographyP>{t("footer.resources.faq")}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="text-center mt-8">
          <TypographyP>
            {t("footer.allRightsReserved", { currentDate: useNow() })}
          </TypographyP>
        </div>
      </div>
    </footer>
  );
}
