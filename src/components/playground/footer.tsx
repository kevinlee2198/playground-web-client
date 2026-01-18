import { createTranslator } from "@/lib/i18n/translator";
import { Dictionary } from "@/lib/i18n/types";
import Link from "next/link";
import { TypographyH5, TypographyP } from "../ui/typography";

interface Props {
  dict: Dictionary;
}

export default async function Footer({ dict }: Props) {
  const t = createTranslator(dict);

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
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
                <Link href="/resources/about">
                  <TypographyP>{t("footer.company.about")}</TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resources/contact">
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
                <Link href="/resources/privacy-policy">
                  <TypographyP>
                    {t("footer.resources.privacyPolicy")}
                  </TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resources/frequently-asked-questions">
                  <TypographyP>{t("footer.resources.faq")}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="text-center mt-8">
          <TypographyP>
            &copy; {new Date().getFullYear()} {t("common.title")}{" "}
            {t("footer.allRightsReserved")}
          </TypographyP>
        </div>
      </div>
    </footer>
  );
}
