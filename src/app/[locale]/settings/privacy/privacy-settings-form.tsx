"use client";

import { Button } from "@/components/ui/button";
import { FormSelectField, FormSwitchField } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import {
  TypographyH3,
  TypographySmall,
} from "@/components/ui/typography";
import { updatePreferences, type UpdatePreferencesInput } from "../actions";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

interface PrivacySettingsFormProps {
  profileVisibility: string;
  showOnlineStatus: boolean;
  showGameHistory: boolean;
  showStatistics: boolean;
}

export function PrivacySettingsForm({
  profileVisibility,
  showOnlineStatus,
  showGameHistory,
  showStatistics,
}: PrivacySettingsFormProps) {
  const t = useTranslations("settings");
  const [isSavePending, startSaveTransition] = useTransition();
  const [isOnlinePending, startOnlineTransition] = useTransition();
  const [isHistoryPending, startHistoryTransition] = useTransition();
  const [isStatsPending, startStatsTransition] = useTransition();

  const visibilityOptions = [
    { value: "PUBLIC", label: t("privacy.profileVisibilityOptions.public") },
    { value: "PRIVATE", label: t("privacy.profileVisibilityOptions.private") },
  ];

  const form = useForm({
    defaultValues: {
      profileVisibility,
      showOnlineStatus,
      showGameHistory,
      showStatistics,
    },
    onSubmit: async ({ value }) => {
      startSaveTransition(async () => {
        const input: UpdatePreferencesInput = {};
        if (value.profileVisibility !== profileVisibility) {
          input.profileVisibility = value.profileVisibility;
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

  const autoSave = useCallback(
    (
      fieldName: "showOnlineStatus" | "showGameHistory" | "showStatistics",
      newValue: boolean,
      startTransition: typeof startOnlineTransition,
    ) => {
      const previousValue = !newValue;
      startTransition(async () => {
        const result = await updatePreferences({ [fieldName]: newValue });
        if (!result.success) {
          form.setFieldValue(fieldName, previousValue);
          toast.error(t("saveError"));
        } else {
          toast.success(t("saveSuccess"));
        }
      });
    },
    [form, t],
  );

  const handleOnlineStatusChange = useCallback(
    (v: boolean) => autoSave("showOnlineStatus", v, startOnlineTransition),
    [autoSave],
  );
  const handleGameHistoryChange = useCallback(
    (v: boolean) => autoSave("showGameHistory", v, startHistoryTransition),
    [autoSave],
  );
  const handleStatisticsChange = useCallback(
    (v: boolean) => autoSave("showStatistics", v, startStatsTransition),
    [autoSave],
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
        aria-label={t("privacy.profileVisibilityDescription")}
      >
        <TypographyH3>
          {t("privacy.profileVisibilityDescription")}
        </TypographyH3>
        <form.Field name="profileVisibility">
          {(field) => (
            <FormSelectField
              field={field}
              label={t("privacy.profileVisibility")}
              options={visibilityOptions}
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

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TypographyH3>{t("privacy.visibilityControls")}</TypographyH3>
          <TypographySmall className="text-muted-foreground">
            {t("autoSaves")}
          </TypographySmall>
        </div>

        <form.Field name="showOnlineStatus">
          {(field) => (
            <FormSwitchField
              field={field}
              label={t("privacy.showOnlineStatus")}
              description={t("privacy.showOnlineStatusDescription")}
              disabled={isOnlinePending}
              onChange={handleOnlineStatusChange}
            />
          )}
        </form.Field>

        <form.Field name="showGameHistory">
          {(field) => (
            <FormSwitchField
              field={field}
              label={t("privacy.showGameHistory")}
              description={t("privacy.showGameHistoryDescription")}
              disabled={isHistoryPending}
              onChange={handleGameHistoryChange}
            />
          )}
        </form.Field>

        <form.Field name="showStatistics">
          {(field) => (
            <FormSwitchField
              field={field}
              label={t("privacy.showStatistics")}
              description={t("privacy.showStatisticsDescription")}
              disabled={isStatsPending}
              onChange={handleStatisticsChange}
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
