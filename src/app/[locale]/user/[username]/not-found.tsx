import { buttonVariants } from "@/components/ui/button-variants";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import type { JSX } from "react";

export default function UserNotFound(): JSX.Element {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">404</TypographyH1>
      <TypographyMuted className="mb-6">User not found</TypographyMuted>
      <Link href="/" className={buttonVariants()}>
        Return Home
      </Link>
    </div>
  );
}
