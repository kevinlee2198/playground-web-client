// TODO: Replace placeholder content with real Contact page copy and layout
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const t = useTranslations("contact");
  return (
    <div className="flex flex-col items-center justify-between m-24">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>

      <ul>
        <li>{t("email")}</li>
        <li>{t("phone")}</li>
      </ul>
    </div>
  );
}
