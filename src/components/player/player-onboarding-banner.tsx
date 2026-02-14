"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "playerOnboardingDismissed";

export function PlayerOnboardingBanner() {
  const t = useTranslations("player.onboarding");
  const [isDismissed, setIsDismissed] = useState(true); // SSR safe default

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    // Reading from localStorage (external store) on mount — setState is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDismissed(dismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <Alert className="relative border-primary bg-primary/10">
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="mt-2 flex items-center justify-between gap-4">
        <p className="flex-1">{t("description")}</p>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/player" />}>{t("cta")}</Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label={t("dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
