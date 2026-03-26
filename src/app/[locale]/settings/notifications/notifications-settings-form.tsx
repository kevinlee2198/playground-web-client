"use client";

import { Button } from "@/components/ui/button";
import { FormSelectField, FormSwitchField } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import { TypographySmall } from "@/components/ui/typography";
import { updatePreferences } from "../actions";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

interface NotificationsSettingsFormProps {
  notificationsEnabled: boolean;
  emailDigestFrequency: string;
}

export function NotificationsSettingsForm({
  notificationsEnabled,
  emailDigestFrequency,
}: NotificationsSettingsFormProps) {
  const t = useTranslations("settings");
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();

  const emailDigestOptions = [
    { value: "DAILY", label: t("notifications.emailDigestOptions.daily") },
    { value: "WEEKLY", label: t("notifications.emailDigestOptions.weekly") },
    { value: "NEVER", label: t("notifications.emailDigestOptions.never") },
  ];

  const form = useForm({
    defaultValues: {
      notificationsEnabled,
      emailDigestFrequency,
    },
    onSubmit: async ({ value }) => {
      startSaveTransition(async () => {
        const input: Record<string, unknown> = {};
        if (value.emailDigestFrequency !== emailDigestFrequency) {
          input.emailDigestFrequency = value.emailDigestFrequency;
        }
        if (Object.keys(input).length === 0) {
          toast.success(t("saveSuccess"));
          return;
        }
        const result = await updatePreferences(input);
        if (result.success) {
          toast.success(t("saveSuccess"));
        } else {
          toast.error(t("saveError"));
        }
      });
    },
  });

  const handleAutoSave = useCallback(
    (newValue: boolean) => {
      // field.handleChange already ran before onChange fires, so previous = inverse
      const previousValue = !newValue;
      startToggleTransition(async () => {
        const result = await updatePreferences({
          notificationsEnabled: newValue,
        });
        if (!result.success) {
          form.setFieldValue("notificationsEnabled", previousValue);
          toast.error(t("saveError"));
        } else {
          toast.success(t("saveSuccess"));
        }
      });
    },
    [form, t],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
      aria-label={t("notifications.title")}
    >
      <div className="flex items-center gap-2">
        <form.Field name="notificationsEnabled">
          {(field) => (
            <FormSwitchField
              field={field}
              label={t("notifications.enable")}
              description={t("notifications.enableDescription")}
              disabled={isTogglePending}
              onChange={handleAutoSave}
            />
          )}
        </form.Field>
        <TypographySmall className="text-muted-foreground">
          {t("autoSaves")}
        </TypographySmall>
      </div>

      <Separator />

      <form.Field name="emailDigestFrequency">
        {(field) => (
          <FormSelectField
            field={field}
            label={t("notifications.emailDigest")}
            options={emailDigestOptions}
          />
        )}
      </form.Field>
      <Button type="submit" disabled={isSavePending}>
        {isSavePending && (
          <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
        )}
        {t("saveChanges")}
      </Button>
    </form>
  );
}
