# Account Settings Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sidebar-navigated settings hub with 4 pages (Display, Games, Notifications, Privacy) that read/write user preferences via GraphQL.

**Architecture:** Server Components fetch data, pass to Client Component forms. Settings layout provides auth guard + sidebar nav. Auto-save toggles fire mutations immediately with rollback on failure; select fields use a save button. Theme is client-side only via next-themes.

**Tech Stack:** Next.js 16 App Router, TanStack Form, shadcn/ui (Toggle, Select, Switch, Separator, Skeleton), next-themes, next-intl, json-to-graphql-query, Sonner toasts.

**Spec:** `docs/superpowers/specs/2026-03-25-account-settings-frontend-design.md`

---

### Task 1: Prerequisites — ThemeProvider + FormSwitchField Fixes

**Files:**
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/components/ui/form-field.tsx:258-281`

- [ ] **Step 1: Add ThemeProvider to root layout**

In `src/app/[locale]/layout.tsx`, add the import and wrap providers:

```typescript
// Add import at top
import { ThemeProvider } from "next-themes";
```

Change the `<html>` tag to add `suppressHydrationWarning`:

```typescript
    <html
      lang={locale}
      className={`${nunito.variable} ${quicksand.variable}`}
      style={{ colorScheme: "light dark" }}
      suppressHydrationWarning
    >
```

Wrap the `<NextIntlClientProvider>` contents with `<ThemeProvider>`:

```typescript
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ScrollDirectionProvider>
              <SkipNavLink />
              <Navbar />
              <TabBar />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
              <NewGameFab />
              <Toaster />
            </ScrollDirectionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
```

- [ ] **Step 2: Fix FormSwitchField — add id, description, onChange**

In `src/components/ui/form-field.tsx`, add `FieldDescription` to the import from `@/components/ui/field`:

```typescript
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
```

Replace the `FormSwitchFieldProps` interface and `FormSwitchField` function (lines 258-281):

```typescript
interface FormSwitchFieldProps {
  field: AnyFieldApi;
  label: string;
  description?: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export function FormSwitchField({
  field,
  label,
  description,
  disabled,
  onChange,
}: FormSwitchFieldProps) {
  const descriptionId = description ? `${field.name}-description` : undefined;
  return (
    <Field orientation="horizontal">
      <Switch
        id={field.name}
        checked={field.state.value ?? false}
        onCheckedChange={(checked) => {
          field.handleChange(checked);
          onChange?.(checked);
        }}
        disabled={disabled}
        aria-describedby={descriptionId}
      />
      <div>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && (
          <FieldDescription id={descriptionId}>
            {description}
          </FieldDescription>
        )}
      </div>
    </Field>
  );
}
```

- [ ] **Step 3: Run build to verify no regressions**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds. No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/layout.tsx src/components/ui/form-field.tsx
git commit -m "feat(settings): add ThemeProvider and fix FormSwitchField accessibility"
```

---

### Task 2: i18n Messages

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add settings i18n keys**

Add the following keys inside the existing `"settings"` object in `messages/en.json` (alongside the existing `"blocked"` key):

```json
"nav": {
  "display": "Display",
  "games": "Games",
  "notifications": "Notifications",
  "privacy": "Privacy"
},
"display": {
  "title": "Display",
  "description": "Customize your visual preferences",
  "theme": "Theme",
  "themeOptions": {
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "language": "Language"
},
"games": {
  "title": "Games",
  "description": "Configure your game experience",
  "measurementUnit": "Measurement units",
  "measurementUnitDescription": "Used for height, weight, and distances",
  "measurementUnitOptions": {
    "metric": "Metric (cm, kg)",
    "imperial": "Imperial (ft, lbs)"
  },
  "preferredSports": "Preferred sports",
  "preferredSportsDescription": "Highlight these sports across the app",
  "sports": {
    "baseball": "Baseball",
    "basketball": "Basketball",
    "football": "Football",
    "tennis": "Tennis",
    "pickleball": "Pickleball"
  }
},
"notifications": {
  "title": "Notifications",
  "description": "Control how you receive updates",
  "enable": "Enable notifications",
  "enableDescription": "Receive push notifications for activity",
  "emailDigest": "Email digest",
  "emailDigestDescription": "How often to receive email summaries",
  "emailDigestOptions": {
    "daily": "Daily",
    "weekly": "Weekly",
    "never": "Never"
  }
},
"privacy": {
  "title": "Privacy",
  "description": "Control who can see your information",
  "profileVisibility": "Profile visibility",
  "profileVisibilityDescription": "Control who can see your profile",
  "profileVisibilityOptions": {
    "public": "Public",
    "private": "Private"
  },
  "visibilityControls": "Visibility controls",
  "showOnlineStatus": "Show online status",
  "showOnlineStatusDescription": "Let others see when you're active",
  "showGameHistory": "Show game history",
  "showGameHistoryDescription": "Display your past games on your profile",
  "showStatistics": "Show statistics",
  "showStatisticsDescription": "Display your performance stats on your profile",
  "blockedUsers": "Blocked users"
},
"autoSaves": "Auto-saves",
"saveChanges": "Save changes",
"saveSuccess": "Settings saved",
"saveError": "Failed to save settings"
```

- [ ] **Step 2: Run lint to verify JSON is valid**

Run: `npm run lint 2>&1 | tail -10`
Expected: No JSON parse errors.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat(settings): add i18n messages for settings pages"
```

---

### Task 3: Server Actions — loadUserPreferences + updatePreferences

**Files:**
- Modify: `src/app/[locale]/settings/actions.ts`

- [ ] **Step 1: Add loadUserPreferences and updatePreferences**

Add to `src/app/[locale]/settings/actions.ts` (keep the existing `loadBlockedUsers` function):

```typescript
"use server";

import { auth } from "@/lib/auth";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { EnumType } from "json-to-graphql-query";
import { headers } from "next/headers";
import { cache } from "react";

const preferencesSelection = {
  measurementUnit: true,
  notificationsEnabled: true,
  emailDigestFrequency: true,
  profileVisibility: true,
  showOnlineStatus: true,
  showGameHistory: true,
  showStatistics: true,
  preferredSports: true,
} as const;

export interface UserPreferences {
  measurementUnit: string;
  notificationsEnabled: boolean;
  emailDigestFrequency: string;
  profileVisibility: string;
  showOnlineStatus: boolean;
  showGameHistory: boolean;
  showStatistics: boolean;
  preferredSports: string[];
}

export const loadUserPreferences = cache(
  async (): Promise<UserPreferences | null> => {
    try {
      const response = await authQuery({
        me: {
          preferences: preferencesSelection,
        },
      });

      if (response.errors?.length > 0) {
        return null;
      }

      return response.data?.me?.preferences ?? null;
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      return null;
    }
  },
);

export interface UpdatePreferencesInput {
  measurementUnit?: string;
  notificationsEnabled?: boolean;
  emailDigestFrequency?: string;
  profileVisibility?: string;
  showOnlineStatus?: boolean;
  showGameHistory?: boolean;
  showStatistics?: boolean;
  preferredSports?: string[];
}

interface UpdatePreferencesResult {
  success: boolean;
  preferences?: UserPreferences;
  errorType?: string;
  message?: string;
}

export async function updatePreferences(
  input: UpdatePreferencesInput,
): Promise<UpdatePreferencesResult> {
  // Verify authentication inside the server action
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Not authenticated",
    };
  }

  try {
    // Wrap enum string values with EnumType for json-to-graphql-query
    const gqlInput: Record<string, unknown> = {};
    if (input.measurementUnit !== undefined) {
      gqlInput.measurementUnit = new EnumType(input.measurementUnit);
    }
    if (input.notificationsEnabled !== undefined) {
      gqlInput.notificationsEnabled = input.notificationsEnabled;
    }
    if (input.emailDigestFrequency !== undefined) {
      gqlInput.emailDigestFrequency = new EnumType(input.emailDigestFrequency);
    }
    if (input.profileVisibility !== undefined) {
      gqlInput.profileVisibility = new EnumType(input.profileVisibility);
    }
    if (input.showOnlineStatus !== undefined) {
      gqlInput.showOnlineStatus = input.showOnlineStatus;
    }
    if (input.showGameHistory !== undefined) {
      gqlInput.showGameHistory = input.showGameHistory;
    }
    if (input.showStatistics !== undefined) {
      gqlInput.showStatistics = input.showStatistics;
    }
    if (input.preferredSports !== undefined) {
      gqlInput.preferredSports = input.preferredSports.map(
        (s) => new EnumType(s),
      );
    }

    const response = await authMutate({
      updateUserPreferences: {
        __args: { input: gqlInput },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateUserPreferencesResponse",
            preferences: preferencesSelection,
          },
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: response.errors[0].message,
      };
    }

    const data = response.data?.updateUserPreferences;
    if (!data || data.__typename !== "UpdateUserPreferencesResponse") {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "Unexpected response",
      };
    }

    return { success: true, preferences: data.preferences };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update preferences",
    };
  }
}

// Keep existing loadBlockedUsers below
```

- [ ] **Step 2: Run build to verify types**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/settings/actions.ts
git commit -m "feat(settings): add loadUserPreferences and updatePreferences server actions"
```

---

### Task 4: Settings Layout + Sidebar Nav + Loading Skeleton

**Files:**
- Create: `src/app/[locale]/settings/layout.tsx`
- Create: `src/app/[locale]/settings/page.tsx`
- Create: `src/app/[locale]/settings/loading.tsx`
- Create: `src/app/[locale]/settings/settings-sidebar-nav.tsx`

- [ ] **Step 1: Create settings-sidebar-nav.tsx**

```typescript
"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Bell, Gamepad2, Lock, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { key: "display", icon: Monitor, href: "/settings/display" },
  { key: "games", icon: Gamepad2, href: "/settings/games" },
  { key: "notifications", icon: Bell, href: "/settings/notifications" },
  { key: "privacy", icon: Lock, href: "/settings/privacy" },
] as const;

export function SettingsSidebarNav() {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="flex flex-col gap-1">
      {navItems.map(({ key, icon: Icon, href }) => {
        const isActive = pathname.includes(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create layout.tsx**

```typescript
import { fetchCurrentUser } from "@/components/auth/actions";
import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { SettingsSidebarNav } from "./settings-sidebar-nav";

export const metadata: Metadata = {
  title: "Settings | Playground",
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps) {
  const [{ locale }, currentUser] = await Promise.all([
    params,
    fetchCurrentUser(),
  ]);

  if (!currentUser) {
    redirect({ href: "/", locale });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <SettingsSidebarNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create page.tsx (redirect to display)**

```typescript
import { redirect } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  redirect({ href: "/settings/display", locale });
}
```

- [ ] **Step 4: Create loading.tsx**

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading settings">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-10 w-full max-w-xs" />
      </div>
      <Skeleton className="h-10 w-28" />
    </div>
  );
}
```

- [ ] **Step 5: Run build to verify layout renders**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/settings/layout.tsx src/app/[locale]/settings/page.tsx src/app/[locale]/settings/loading.tsx src/app/[locale]/settings/settings-sidebar-nav.tsx
git commit -m "feat(settings): add settings layout with sidebar navigation"
```

---

### Task 5: Display Settings Page

**Files:**
- Create: `src/app/[locale]/settings/display/page.tsx`
- Create: `src/app/[locale]/settings/display/display-settings-form.tsx`

- [ ] **Step 1: Create display-settings-form.tsx**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormSelectField } from "@/components/ui/form-field";
import { useForm } from "@tanstack/react-form";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
      toast.success(t("saveSuccess"));
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
      <Button type="submit">
        {t("saveChanges")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create display page.tsx**

```typescript
import {
  TypographyH1,
  TypographyMuted,
} from "@/components/ui/typography";
import { getTranslations } from "next-intl/server";
import { DisplaySettingsForm } from "./display-settings-form";

export default async function DisplaySettingsPage() {
  const t = await getTranslations("settings.display");

  return (
    <div>
      <div className="mb-6">
        <TypographyH1>{t("title")}</TypographyH1>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <DisplaySettingsForm />
    </div>
  );
}
```

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/settings/display/
git commit -m "feat(settings): add display settings page with theme selector"
```

---

### Task 6: Games Settings Page

**Files:**
- Create: `src/app/[locale]/settings/games/page.tsx`
- Create: `src/app/[locale]/settings/games/games-settings-form.tsx`

- [ ] **Step 1: Create games-settings-form.tsx**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FormSelectField } from "@/components/ui/form-field";
import { Toggle } from "@/components/ui/toggle";
import { SportType } from "@/lib/constants";
import { updatePreferences } from "../actions";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

const sportTypes = Object.values(SportType);

const sportI18nKeys: Record<string, string> = {
  BASEBALL: "games.sports.baseball",
  BASKETBALL: "games.sports.basketball",
  FOOTBALL: "games.sports.football",
  TENNIS: "games.sports.tennis",
  PICKLEBALL: "games.sports.pickleball",
};

interface GamesSettingsFormProps {
  measurementUnit: string;
  preferredSports: string[];
}

export function GamesSettingsForm({
  measurementUnit,
  preferredSports,
}: GamesSettingsFormProps) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();

  const measurementOptions = [
    { value: "METRIC", label: t("games.measurementUnitOptions.metric") },
    { value: "IMPERIAL", label: t("games.measurementUnitOptions.imperial") },
  ];

  const form = useForm({
    defaultValues: {
      measurementUnit,
      preferredSports: preferredSports as string[],
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const input: Record<string, unknown> = {};
        if (value.measurementUnit !== measurementUnit) {
          input.measurementUnit = value.measurementUnit;
        }
        const oldSet = new Set(preferredSports);
        const sportsChanged =
          value.preferredSports.length !== oldSet.size ||
          value.preferredSports.some((s) => !oldSet.has(s));
        if (sportsChanged) {
          input.preferredSports = value.preferredSports;
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <form.Field name="measurementUnit">
        {(field) => (
          <FormSelectField
            field={field}
            label={t("games.measurementUnit")}
            options={measurementOptions}
          />
        )}
      </form.Field>

      <form.Field name="preferredSports">
        {(field) => {
          const selected = field.state.value;
          const toggle = (sport: string) => {
            const next = selected.includes(sport)
              ? selected.filter((s) => s !== sport)
              : [...selected, sport];
            field.handleChange(next);
          };
          return (
            <Field>
              <FieldLabel id="preferred-sports-label">
                {t("games.preferredSports")}
              </FieldLabel>
              <FieldDescription>
                {t("games.preferredSportsDescription")}
              </FieldDescription>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="preferred-sports-label"
              >
                {sportTypes.map((sport) => (
                  <Toggle
                    key={sport}
                    variant="outline"
                    pressed={selected.includes(sport)}
                    onPressedChange={() => toggle(sport)}
                  >
                    {t(sportI18nKeys[sport] ?? sport)}
                  </Toggle>
                ))}
              </div>
            </Field>
          );
        }}
      </form.Field>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />}
        {t("saveChanges")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create games page.tsx**

```typescript
import {
  TypographyH1,
  TypographyMuted,
} from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadUserPreferences } from "../actions";
import { GamesSettingsForm } from "./games-settings-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function GamesSettingsPage({ params }: PageProps) {
  const [{ locale }, t, preferences] = await Promise.all([
    params,
    getTranslations("settings.games"),
    loadUserPreferences(),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
  }

  return (
    <div>
      <div className="mb-6">
        <TypographyH1>{t("title")}</TypographyH1>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <GamesSettingsForm
        measurementUnit={preferences.measurementUnit}
        preferredSports={preferences.preferredSports}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/settings/games/
git commit -m "feat(settings): add games settings page with measurement units and preferred sports"
```

---

### Task 7: Notifications Settings Page

**Files:**
- Create: `src/app/[locale]/settings/notifications/page.tsx`
- Create: `src/app/[locale]/settings/notifications/notifications-settings-form.tsx`

- [ ] **Step 1: Create notifications-settings-form.tsx**

```typescript
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
```

- [ ] **Step 2: Create notifications page.tsx**

```typescript
import {
  TypographyH1,
  TypographyMuted,
} from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadUserPreferences } from "../actions";
import { NotificationsSettingsForm } from "./notifications-settings-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NotificationsSettingsPage({
  params,
}: PageProps) {
  const [{ locale }, t, preferences] = await Promise.all([
    params,
    getTranslations("settings.notifications"),
    loadUserPreferences(),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
  }

  return (
    <div>
      <div className="mb-6">
        <TypographyH1>{t("title")}</TypographyH1>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <NotificationsSettingsForm
        notificationsEnabled={preferences.notificationsEnabled}
        emailDigestFrequency={preferences.emailDigestFrequency}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/settings/notifications/
git commit -m "feat(settings): add notifications settings page with auto-save toggle"
```

---

### Task 8: Privacy Settings Page + Blocked Users Relocation

**Files:**
- Create: `src/app/[locale]/settings/privacy/page.tsx`
- Create: `src/app/[locale]/settings/privacy/privacy-settings-form.tsx`
- Remove: `src/app/[locale]/settings/blocked/page.tsx`

- [ ] **Step 1: Create privacy-settings-form.tsx**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { FormSelectField, FormSwitchField } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import {
  TypographyH2,
  TypographyMuted,
  TypographySmall,
} from "@/components/ui/typography";
import { updatePreferences } from "../actions";
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
        const input: Record<string, unknown> = {};
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

  const makeAutoSaveHandler = useCallback(
    (
      fieldName: "showOnlineStatus" | "showGameHistory" | "showStatistics",
      startTransition: typeof startOnlineTransition,
    ) => {
      return (newValue: boolean) => {
        // field.handleChange already ran before onChange fires, so previous = inverse
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
      };
    },
    [form, t],
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Profile Visibility */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
        aria-label={t("privacy.profileVisibilityDescription")}
      >
        <div>
          <TypographyH2>
            {t("privacy.profileVisibilityDescription")}
          </TypographyH2>
        </div>
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

      {/* Section 2: Visibility Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TypographyH2>{t("privacy.visibilityControls")}</TypographyH2>
          <TypographySmall className="text-muted-foreground">
            {t("autoSaves")}
          </TypographySmall>
        </div>

        <div className="space-y-4">
          <form.Field name="showOnlineStatus">
            {(field) => (
              <FormSwitchField
                field={field}
                label={t("privacy.showOnlineStatus")}
                description={t("privacy.showOnlineStatusDescription")}
                disabled={isOnlinePending}
                onChange={makeAutoSaveHandler(
                  "showOnlineStatus",
                  startOnlineTransition,
                )}
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
                onChange={makeAutoSaveHandler(
                  "showGameHistory",
                  startHistoryTransition,
                )}
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
                onChange={makeAutoSaveHandler(
                  "showStatistics",
                  startStatsTransition,
                )}
              />
            )}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create privacy page.tsx**

```typescript
import {
  TypographyH1,
  TypographyH2,
  TypographyMuted,
} from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { BlockedUserEntry } from "../blocked/blocked-users-list";
import { BlockedUsersList } from "../blocked/blocked-users-list";
import { loadBlockedUsers, loadUserPreferences } from "../actions";
import { PrivacySettingsForm } from "./privacy-settings-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface BlockedUserEdge {
  node: {
    id: string;
    displayName: string;
    username: string;
  };
}

export default async function PrivacySettingsPage({ params }: PageProps) {
  const [{ locale }, t, preferences, blockedUsers] = await Promise.all([
    params,
    getTranslations("settings"),
    loadUserPreferences(),
    loadBlockedUsers(50),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
  }

  const blockedEntries: BlockedUserEntry[] =
    (blockedUsers?.edges as BlockedUserEdge[] | undefined)?.map((edge) => ({
      userId: edge.node.id,
      displayName: edge.node.displayName,
      username: edge.node.username,
    })) ?? [];

  return (
    <div>
      <div className="mb-6">
        <TypographyH1>{t("privacy.title")}</TypographyH1>
        <TypographyMuted>{t("privacy.description")}</TypographyMuted>
      </div>

      <PrivacySettingsForm
        profileVisibility={preferences.profileVisibility}
        showOnlineStatus={preferences.showOnlineStatus}
        showGameHistory={preferences.showGameHistory}
        showStatistics={preferences.showStatistics}
      />

      <Separator className="my-6" />

      {/* Section 3: Blocked Users */}
      <div>
        <div className="mb-4">
          <TypographyH2>{t("privacy.blockedUsers")}</TypographyH2>
          <TypographyMuted>{t("blocked.description")}</TypographyMuted>
        </div>
        <BlockedUsersList entries={blockedEntries} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete old blocked page.tsx**

Delete `src/app/[locale]/settings/blocked/page.tsx`. Keep `blocked-users-list.tsx` in place — it's imported by the privacy page.

```bash
rm src/app/[locale]/settings/blocked/page.tsx
```

- [ ] **Step 4: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds. The `/settings/blocked` route no longer exists.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/settings/privacy/ src/app/[locale]/settings/blocked/page.tsx
git commit -m "feat(settings): add privacy settings page and relocate blocked users"
```

---

### Task 9: Update Playwright Tests

**Files:**
- Modify: `tests/pages/settings-blocked.spec.ts`

- [ ] **Step 1: Update tests to use new privacy page route**

Replace the contents of `tests/pages/settings-blocked.spec.ts`:

```typescript
import { http, HttpResponse } from "msw";
import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockBlockedUsersResponse } from "../fixtures/mock-data/blocked-users";

test.describe("Settings: Privacy & Blocked Users", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json({ data: { me: null } }),
      ),
    );
    await unauthenticatedPage.goto("/en/settings/privacy");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders privacy heading", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Privacy" }),
    ).toBeVisible();
  });

  test("authenticated: renders blocked users section", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Blocked users" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/won't be able to see your profile/i),
    ).toBeVisible();
  });

  test("authenticated: empty blocked users list", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByText(/haven't blocked anyone/i),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run Playwright tests**

Run: `npx playwright test tests/pages/settings-blocked.spec.ts 2>&1 | tee /tmp/pw-settings.txt`
Then read: `/tmp/pw-settings.txt`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/pages/settings-blocked.spec.ts
git commit -m "test(settings): update blocked users tests for privacy page relocation"
```

---

### Task 10: getInitials/getFullName Utilities + Nullable firstName/lastName Types

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/types/user.ts`
- Modify: `src/lib/types/chat.ts`
- Modify: `src/lib/types/game.ts`
- Modify: `src/app/[locale]/game/actions.ts`
- Modify: `src/components/profile/profile-header.tsx`
- Modify: `src/components/profile/profile-avatar.tsx`
- Modify: `src/components/chat/message-bubble.tsx`
- Modify: `src/components/chat/member-list-panel.tsx`
- Modify: `src/components/game/manage-editors-dialog.tsx`
- Modify: `src/components/game/invite-players-dialog.tsx`

- [ ] **Step 1: Add getInitials and getFullName utilities to utils.ts**

Add to `src/lib/utils.ts`:

```typescript
/** Safely compute avatar initials from a user with potentially null name fields. */
export function getInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
}): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  const display = user.displayName.trim();
  if (!display) return "?";
  return display.substring(0, 2).toUpperCase();
}

/** Get full name with fallback to displayName when firstName/lastName are null. */
export function getFullName(user: {
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
}): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  return user.displayName;
}
```

- [ ] **Step 2: Update UserSearchNode type**

In `src/lib/types/user.ts`, change `firstName` and `lastName` to nullable:

```typescript
export interface UserSearchNode {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  /** null when unauthenticated */
  viewerFollowsUser: boolean | null;
  userFollowsViewer: boolean | null;
}
```

- [ ] **Step 3: Update ChatUser type**

In `src/lib/types/chat.ts`, change `firstName` and `lastName` to nullable:

```typescript
export interface ChatUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
}
```

- [ ] **Step 4: Update GameMemberUser type and query**

In `src/lib/types/game.ts`, update `GameMemberUser`:

```typescript
export interface GameMemberUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  username: string;
}
```

In `src/app/[locale]/game/actions.ts`, update `gameMemberSelection` (line 42-46) to add `displayName`:

```typescript
const gameMemberSelection = {
  id: true,
  user: { id: true, firstName: true, lastName: true, displayName: true, username: true },
  role: true,
} as const;
```

Also find any other inline game member queries in the same file that select `user: { firstName, lastName }` and add `displayName: true` to them as well.

- [ ] **Step 5: Update ProfileHeaderProps and use getInitials**

In `src/components/profile/profile-header.tsx`:

Update the type (lines 14-15):
```typescript
    firstName: string | null;
    lastName: string | null;
```

Replace the initials line (line 35-36) with:
```typescript
import { getInitials } from "@/lib/utils";
// ...
  const initials = getInitials(user);
```

Also update the `ProfileAvatar` props passed (lines 51-52) — `firstName` and `lastName` are now nullable, which matches `ProfileAvatar`'s updated type.

- [ ] **Step 6: Update ProfileAvatarProps and use getInitials**

In `src/components/profile/profile-avatar.tsx`:

Update the type (lines 22-23):
```typescript
    firstName: string | null;
    lastName: string | null;
```

Replace the initials line (line 51-52) with:
```typescript
import { getInitials } from "@/lib/utils";
// ...
  const initials = getInitials(user);
```

- [ ] **Step 7: Update message-bubble.tsx to use getInitials**

In `src/components/chat/message-bubble.tsx`, replace the initials line (line 78-79):

```typescript
import { getInitials } from "@/lib/utils";
// ...
  const initials = getInitials({ ...message.user, displayName: userName });
```

- [ ] **Step 8: Update full name displays to use getFullName**

In `src/components/chat/member-list-panel.tsx` (line 265), add import and replace:
```typescript
import { getFullName } from "@/lib/utils";
// ...
const memberName = getFullName(member.user);
```

In `src/components/game/manage-editors-dialog.tsx` (line 175), add import and replace:
```typescript
import { getFullName } from "@/lib/utils";
// ...
const name = getFullName(member.user);
```

Apply the same `getFullName(member.user)` or `getFullName(user)` pattern to lines 253, 288, 317 in the same file — any `${...firstName} ${...lastName}` expression.

In `src/components/game/invite-players-dialog.tsx` (line 37-38), replace the `userDisplayName` function body:
```typescript
import { getFullName } from "@/lib/utils";
// ...
function userDisplayName(user: UserSearchNode): string {
  return getFullName(user);
}
```

And line 290 — replace `{user.firstName} {user.lastName}` with `{userDisplayName(user)}`.

- [ ] **Step 9: Run build to verify all type changes compile**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds. TypeScript catches any remaining non-null accesses.

- [ ] **Step 10: Commit**

```bash
git add src/lib/utils.ts src/lib/types/user.ts src/lib/types/chat.ts src/lib/types/game.ts src/app/[locale]/game/actions.ts src/components/profile/profile-header.tsx src/components/profile/profile-avatar.tsx src/components/chat/message-bubble.tsx src/components/chat/member-list-panel.tsx src/components/game/manage-editors-dialog.tsx src/components/game/invite-players-dialog.tsx
git commit -m "refactor: make firstName/lastName nullable and add getInitials/getFullName utilities"
```

---

### Task 11: Profile Page — Private Profile Gating

**Files:**
- Modify: `src/app/[locale]/user/[username]/page.tsx`
- Modify: `messages/en.json`

- [ ] **Step 1: Add private profile i18n keys**

Add to the `"profile"` object in `messages/en.json`:

```json
"privateProfile": {
  "title": "This account is private",
  "description": "This account's full profile is only visible to followers"
}
```

- [ ] **Step 2: Update buildUserQuery to include profileVisibility**

In `src/app/[locale]/user/[username]/page.tsx`, add `profileVisibility` to `buildUserQuery()`:

```typescript
function buildUserQuery(username: string) {
  return {
    user: {
      __args: { input: { username } },
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      displayName: true,
      biography: true,
      profileVisibility: true,
      profilePicture: resourceFragment,
      followerCount: true,
      followingCount: true,
      viewerFollowsUser: true,
      userFollowsViewer: true,
      player: {
        id: true,
        age: true,
        height: true,
        weight: true,
      },
    },
  };
}
```

- [ ] **Step 3: Gate profile sections on visibility**

In the same file, update the `UserProfilePage` component. After the `if (!user)` check, add:

```typescript
  const isPrivateProfile =
    !isOwnProfile &&
    user.profileVisibility === "PRIVATE" &&
    user.viewerFollowsUser !== true;
```

Then update the return JSX to conditionally render sections:

```typescript
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader
        user={user}
        isOwnProfile={isOwnProfile}
        isAuthenticated={isAuthenticated}
      />

      {isPrivateProfile ? (
        <PrivateProfileNotice />
      ) : (
        <>
          {isOwnProfile ? (
            <PlayerStatsEditorLoader initialPlayer={player} />
          ) : (
            <PlayerStats player={player} />
          )}

          <Suspense fallback={<GameHistorySkeleton />}>
            <GameHistorySection playerId={player.id} />
          </Suspense>
        </>
      )}
    </main>
  );
```

- [ ] **Step 4: Add PrivateProfileNotice component**

Add this component inline in the same file (above `UserProfilePage`), or create a separate file. Inline is fine since it's small:

```typescript
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TypographyMuted } from "@/components/ui/typography";

async function PrivateProfileNotice() {
  const t = await getTranslations("profile.privateProfile");
  return (
    <section
      aria-labelledby="private-profile-heading"
      className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center"
    >
      <Lock className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h2
        id="private-profile-heading"
        className="text-xl font-semibold tracking-tight"
      >
        {t("title")}
      </h2>
      <TypographyMuted className="mt-2 max-w-sm">
        {t("description")}
      </TypographyMuted>
    </section>
  );
}
```

- [ ] **Step 5: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/user/[username]/page.tsx messages/en.json
git commit -m "feat(profile): gate profile sections for private profiles"
```

---

### Task 12: Lint, Build, Full Test Pass

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds.

- [ ] **Step 3: Run unit tests**

Run: `npm test 2>&1 | tee /tmp/vitest-results.txt`
Then read: `/tmp/vitest-results.txt`
Expected: All tests pass.

- [ ] **Step 4: Run Playwright tests**

Run: `npx playwright test 2>&1 | tee /tmp/pw-results.txt`
Then read: `/tmp/pw-results.txt`
Expected: All tests pass. No regressions from settings or profile changes.
