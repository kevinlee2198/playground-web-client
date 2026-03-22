"use client";

import { buttonVariants } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label: string;
}

export function BackButton({ label }: BackButtonProps) {
  const router = useRouter();

  function handleClick(): void {
    if (document.referrer.startsWith(window.location.origin)) {
      router.back();
    } else {
      router.push("/games");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "gap-1.5 text-muted-foreground",
      )}
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
