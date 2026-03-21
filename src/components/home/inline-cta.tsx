"use client";

import { useTranslations } from "next-intl";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { TypographyP } from "@/components/ui/typography";

async function handleSignIn() {
  await signIn.oauth2({
    providerId: "keycloak",
    callbackURL: window.location.href,
  });
}

export function InlineCta() {
  const t = useTranslations("home.cta");

  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-background to-muted p-6 text-center">
      <TypographyP className="mb-1 font-semibold">
        {t("inlineTitle")}
      </TypographyP>
      <TypographyP className="mb-4 text-muted-foreground">
        {t("inlineDescription")}
      </TypographyP>
      <Button onClick={handleSignIn} size="sm">
        {t("inlineButton")}
      </Button>
    </div>
  );
}

export function GetStartedLink() {
  const t = useTranslations("home.cta");

  return (
    <div className="flex justify-end">
      <Button
        variant="link"
        size="sm"
        onClick={handleSignIn}
        className="h-auto p-0 text-sm"
      >
        {t("getStarted")} &rarr;
      </Button>
    </div>
  );
}
