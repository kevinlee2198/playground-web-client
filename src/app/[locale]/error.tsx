"use client";

import { Button } from "@/components/ui/button";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: Props): ReactNode {
  useEffect(() => {
    console.error("[locale-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">Something went wrong</TypographyH1>
      <TypographyMuted className="mb-6">
        An unexpected error occurred. Please try again.
      </TypographyMuted>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
