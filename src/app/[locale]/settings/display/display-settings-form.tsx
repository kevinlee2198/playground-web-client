"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormSelectField } from "@/components/ui/form-field";
import { useForm } from "@tanstack/react-form";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";

export function DisplaySettingsForm() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: t("display.themeOptions.light") },
    { value: "dark", label: t("display.themeOptions.dark") },
    { value: "system", label: t("display.themeOptions.system") },
  ];

  const languageOptions = [{ value: "en", label: "English" }];

  const form = useForm({
    defaultValues: {
      theme: theme ?? "system",
      language: "en",
    },
    onSubmit: async ({ value }) => {
      setTheme(value.theme);
      toast.add({ title: t("saveSuccess"), type: "success" });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <FieldGroup>
        <form.Field name="theme">
          {(field) => (
            <FormSelectField
              field={field}
              label={t("display.theme")}
              options={themeOptions}
            />
          )}
        </form.Field>
        <form.Field name="language">
          {(field) => (
            <FormSelectField
              field={field}
              label={t("display.language")}
              options={languageOptions}
              disabled
            />
          )}
        </form.Field>
      </FieldGroup>
      <Button type="submit">{t("saveChanges")}</Button>
    </form>
  );
}
