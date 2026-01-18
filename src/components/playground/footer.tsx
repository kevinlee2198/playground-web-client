import {
  defaultLocal,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/app/[lang]/dictionaries";
import Link from "next/link";
import { TypographyH5, TypographyP } from "../ui/typography";

interface Props {
  lang: string;
}

export default async function Footer({ lang: initialLang }: Props) {
  const lang: Locale = hasLocale(initialLang) ? initialLang : defaultLocal();
  const dict = await getDictionary(lang);
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-4 gap-8">
          <div className="text-center">
            <TypographyH5>{dict.footer.help.title}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resources/get-started">
                  <TypographyP>{dict.footer.help.gettingStarted}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <TypographyH5>{dict.footer.features.title}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/stat-tracking">
                  <TypographyP>{dict.footer.features.statTracking}</TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/pricing">
                  <TypographyP>text={dict.footer.features.pricing}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <TypographyH5>{dict.common.title}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resources/about">
                  <TypographyP>{dict.footer.company.about}</TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resources/contact">
                  <TypographyP>{dict.footer.company.contact}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <TypographyH5>{dict.footer.resources.title}</TypographyH5>
            <ul className="space-y-2">
              <li>
                <Link href="/resources/privacy-policy">
                  <TypographyP>
                    {dict.footer.resources.privacyPolicy}
                  </TypographyP>
                </Link>
              </li>
              <li>
                <Link href="/resources/frequently-asked-questions">
                  <TypographyP>{dict.footer.resources.faq}</TypographyP>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center mt-8">
          <TypographyP>
            &copy; {new Date().getFullYear()} {dict.common.title}{" "}
            {dict.footer.allRightsReserved}
          </TypographyP>
        </div>
      </div>
    </footer>
  );
}
