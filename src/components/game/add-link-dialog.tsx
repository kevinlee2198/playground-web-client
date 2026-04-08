"use client";

import {
  addGameMediaLink,
  resolveUrl,
} from "@/app/[locale]/game/media-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { toFieldErrors } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import type {
  GameMediaNode,
  ResolveUrlPreview,
  UrlResolutionErrorCode,
} from "@/lib/types/game-media";
import { useForm } from "@tanstack/react-form";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface AddLinkDialogProps {
  gameId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMediaAdded: (media: GameMediaNode) => void;
}

export function AddLinkDialog({
  gameId,
  open,
  onOpenChange,
  onMediaAdded,
}: AddLinkDialogProps) {
  const t = useTranslations("game.media");

  const [preview, setPreview] = useState<ResolveUrlPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(
    null,
  );
  const [rateLimitAnnouncement, setRateLimitAnnouncement] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const urlSchema = useMemo(
    () =>
      z.object({
        url: z.url({
          protocol: /^https$/,
          error: t("addLinkDialog.invalidUrl"),
        }),
      }),
    [t],
  );

  const URL_ERROR_MESSAGES = useMemo<Record<UrlResolutionErrorCode, string>>(
    () => ({
      INVALID_SCHEME: t("errors.invalidScheme"),
      SSRF_BLOCKED: t("errors.urlCannotBeAccessed"),
      TIMEOUT: t("errors.urlTimeout"),
      UNREACHABLE: t("errors.urlUnreachable"),
      UNSUPPORTED_FORMAT: t("errors.unsupportedFormat"),
    }),
    [t],
  );

  const form = useForm({
    defaultValues: {
      url: "",
    },
    validators: {
      onBlur: urlSchema,
    },
    onSubmit: ({ value }) => {
      handleResolve(value.url);
    },
  });

  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return;

    const timer = setTimeout(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          setRateLimitAnnouncement(t("rateLimitCleared"));
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [rateLimitCountdown, t]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setPreview(null);
      setErrorMessage(null);
      setRateLimitCountdown(null);
      setRateLimitAnnouncement(null);
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleResolve(url: string): void {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await resolveUrl(url, gameId);
      if (result.success && result.data) {
        setPreview(result.data);
      } else if (result.errorType === "RateLimitedError") {
        const seconds = result.retryAfterSeconds ?? 60;
        setRateLimitCountdown(seconds);
        setRateLimitAnnouncement(t("errors.rateLimited", { seconds }));
      } else if (result.errorType === "DuplicateMediaError") {
        setPreview(null);
        setErrorMessage(t("errors.duplicateLink"));
      } else if (result.errorType === "UrlResolutionError" && result.errorCode) {
        setErrorMessage(URL_ERROR_MESSAGES[result.errorCode] ?? result.message ?? null);
      } else if (result.errorType === "GameNotFoundError") {
        setErrorMessage(t("errors.gameNotFound"));
      } else if (result.errorType === "GameNotInProgressError") {
        setErrorMessage(t("errors.gameNotInProgress"));
      } else {
        setErrorMessage(result.message ?? null);
      }
    });
  }

  function handleAdd(): void {
    if (!preview) return;
    startTransition(async () => {
      const result = await addGameMediaLink(preview.resolvedUrl, gameId);
      if (result.success && result.gameMedia) {
        onMediaAdded(result.gameMedia);
        handleOpenChange(false);
        toast.success(t("linkAdded"));
      } else if (result.errorType === "RateLimitedError") {
        const seconds = result.retryAfterSeconds ?? 60;
        setRateLimitCountdown(seconds);
        setRateLimitAnnouncement(t("errors.rateLimited", { seconds }));
      } else if (result.errorType === "DuplicateMediaError") {
        setPreview(null);
        toast.error(t("errors.duplicateLink"));
      } else if (result.errorType === "UrlResolutionError" && result.errorCode) {
        toast.error(URL_ERROR_MESSAGES[result.errorCode] ?? result.message ?? t("errors.urlCannotBeAccessed"));
      } else if (result.errorType === "GameNotFoundError") {
        toast.error(t("errors.gameNotFound"));
      } else if (result.errorType === "GameNotInProgressError") {
        toast.error(t("errors.gameNotInProgress"));
      } else {
        toast.error(result.message ?? t("errors.urlCannotBeAccessed"));
      }
    });
  }

  const isRateLimited =
    rateLimitCountdown !== null && rateLimitCountdown > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addLinkDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-2"
          >
            <form.Field name="url">
              {(field) => (
                <Field
                  data-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                      ? true
                      : undefined
                  }
                >
                  <FieldLabel htmlFor={field.name}>
                    {t("addLinkDialog.urlLabel")}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("addLinkDialog.urlPlaceholder")}
                      disabled={isPending}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isPending || isRateLimited}
                    >
                      {isPending && !preview ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                          {t("addLinkDialog.resolving")}
                        </>
                      ) : (
                        t("addLinkDialog.resolve")
                      )}
                    </Button>
                  </div>
                  {field.state.meta.isTouched && (
                    <FieldError
                      errors={toFieldErrors(field.state.meta.errors)}
                    />
                  )}
                </Field>
              )}
            </form.Field>
          </form>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3"
            >
              <TypographyMuted className="text-destructive">
                {errorMessage}
              </TypographyMuted>
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <TypographySmall className="text-muted-foreground">
                {t("addLinkDialog.previewTitle")}
              </TypographySmall>
              <div className="rounded-lg border p-3">
                <div className="flex gap-3">
                  {preview.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- thumbnailUrl comes from user-supplied link preview metadata on arbitrary third-party hosts; cannot be pre-configured in images.remotePatterns
                    <img
                      src={preview.thumbnailUrl}
                      alt={preview.title ?? "Link preview"}
                      className="h-16 w-16 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-muted">
                      <LinkIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    {preview.title && (
                      <TypographySmall className="block truncate">
                        {preview.title}
                      </TypographySmall>
                    )}
                    {preview.description && (
                      <TypographyMuted className="line-clamp-2">
                        {preview.description}
                      </TypographyMuted>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {preview.source !== "CUSTOM_URL" && (
                        <Badge variant="secondary">{preview.source}</Badge>
                      )}
                      <Badge variant="outline">{preview.type}</Badge>
                    </div>
                  </div>
                </div>
                {preview.source === "HUDL" && (
                  <TypographyMuted className="mt-2 text-xs">
                    {t("authRequiredNote", { provider: "Hudl" })}
                  </TypographyMuted>
                )}
              </div>
            </div>
          )}
        </div>

        <div aria-live="assertive" className="sr-only">
          {rateLimitAnnouncement}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("addLinkDialog.cancel")}
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={handleAdd}
              disabled={!preview || isPending || isRateLimited}
            >
              {isPending && preview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  {t("addLinkDialog.adding")}
                </>
              ) : (
                t("addLinkDialog.confirm")
              )}
            </Button>
            {isRateLimited && (
              <TypographyMuted className="text-xs">
                {t("addLinkDialog.rateLimitCountdown", {
                  seconds: rateLimitCountdown,
                })}
              </TypographyMuted>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
