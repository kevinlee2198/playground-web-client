import { buttonVariants } from "@/components/ui/button-variants";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">404</TypographyH1>
      <TypographyMuted className="mb-6">Page not found</TypographyMuted>
      <Link href="/" className={buttonVariants()}>
        Return Home
      </Link>
    </div>
  );
}
