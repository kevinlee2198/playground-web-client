# Account Settings Frontend — Design Spec

**Date**: 2026-03-25
**Status**: Draft
**Backend**: Fully implemented (see `playground-backend/.claudedoc/feature-0079-account-settings/design.md`)

---

## Overview

Frontend implementation for the account settings feature. Users manage display preferences, game settings, notifications, and privacy from a sidebar-navigated settings hub at `/[locale]/settings/`.

The backend GraphQL API is already deployed: `currentUser.preferences` for reading, `updateUserPreferences` mutation for writing. All input fields are optional (PATCH semantics — send only changed fields).

---

## Prerequisites

### ThemeProvider Setup

The root layout (`src/app/[locale]/layout.tsx`) currently has no `ThemeProvider` from `next-themes`. The `useTheme()` hook will silently fail without it. Before implementing the Display settings page:

1. Wrap the `<body>` contents with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
2. Add `suppressHydrationWarning` to the `<html>` tag (required by next-themes)

### FormSwitchField Fixes

The existing `FormSwitchField` in `src/components/ui/form-field.tsx` has two issues:

1. **Broken label association** — renders `<FieldLabel htmlFor={field.name}>` but never passes `id={field.name}` to the `<Switch>` component. Fix: add `id={field.name}` to `Switch`.
2. **Missing props** — needs optional `description` (renders as `FieldDescription` with `aria-describedby` on the switch) and `onChange` callback (fires after `field.handleChange`) for auto-save functionality.

Updated interface:
```typescript
interface FormSwitchFieldProps {
  field: AnyFieldApi;
  label: string;
  description?: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}
```

These are additive changes — existing usages of `FormSwitchField` are unaffected.

---

## Layout

### Sidebar Navigation

Desktop: persistent left sidebar (220px) with content area. The sidebar lists all settings categories with icons. Active category is visually highlighted.

The sidebar renders as a `<nav aria-label="Settings">` landmark element to distinguish it from the primary site navigation. Sidebar icons are decorative (`aria-hidden="true"`) — the text label is the accessible name.

Mobile (low priority — native app will handle mobile): sidebar collapses to a category list page. Tapping a category navigates to the detail page with a back button. Each category is its own Next.js route, so this maps naturally.

### Route Structure

```
/[locale]/settings/              → redirects to /settings/display
/[locale]/settings/display       → Theme, Language
/[locale]/settings/games         → Measurement Units, Preferred Sports
/[locale]/settings/notifications → Notifications toggle, Email digest
/[locale]/settings/privacy       → Profile visibility, visibility toggles, blocked users
```

The existing `/[locale]/settings/blocked/` page is removed as a standalone route. Its functionality moves into the Privacy page as a section. **Note:** This diverges from the backend design spec which shows `blocked-users/` as a separate route — the frontend design is authoritative for frontend routing.

### Settings Layout Component

`src/app/[locale]/settings/layout.tsx` — Server Component wrapping all settings pages. Renders the sidebar navigation and content area. Requires authentication (redirects to `/` if not authenticated).

The sidebar navigation is a Client Component (`settings-sidebar-nav.tsx`) that uses `usePathname()` to highlight the active link. On mobile, the layout renders the sidebar as the main content when on the `/settings` root, and hides it when on a sub-page (showing a back link instead).

### Heading Hierarchy

Each settings page follows this heading structure:
- `<h1>` — page title (e.g., "Privacy")
- `<h2>` — section headings within the page (e.g., "Profile Visibility", "Visibility Controls", "Blocked Users")

The settings sidebar title ("Settings") is not a heading — it's a label for the nav.

### Loading States

Each settings sub-page includes a `loading.tsx` that renders a skeleton/spinner while the server-side GraphQL fetch completes. This prevents a blank flash during page navigation.

### Sidebar Categories

| Category | Route | Icon (Lucide) |
|----------|-------|---------------|
| Display | `/settings/display` | `Monitor` |
| Games | `/settings/games` | `Gamepad2` |
| Notifications | `/settings/notifications` | `Bell` |
| Privacy | `/settings/privacy` | `Lock` |

---

## Pages

### 1. Display (`/settings/display`)

**Fields:**
- **Theme** — `FormSelectField` with options: Light, Dark, System. Client-side only via `next-themes` (`useTheme` hook). No backend mutation needed. Requires `ThemeProvider` (see Prerequisites).
- **Language** — `FormSelectField` with options: English. (Only one locale currently supported; field is present but effectively read-only until more locales are added.)

**Save behavior:** Save button. Theme changes apply immediately via `next-themes` (the `setTheme` call is instant), but the save button provides a consistent UX across pages. Language changes will eventually update the locale on `PlaygroundUser` via an existing mutation.

**Data source:** Theme from `next-themes` (`useTheme`), language from the current locale. No GraphQL query needed for this page.

### 2. Games (`/settings/games`)

**Fields:**
- **Measurement units** — `FormSelectField` with options: Metric (cm, kg), Imperial (ft, lbs).
- **Preferred sports** — Multi-select using the shadcn `Toggle` component (not `Badge`). Each sport from the `SportType` enum is rendered as a toggleable `Toggle` button with `aria-pressed` state. Selected toggles are visually distinct. `Toggle` provides keyboard accessibility (focus, Enter/Space) and proper ARIA semantics out of the box.

**Save behavior:** Save button. Submits `measurementUnit` and `preferredSports` fields via `updateUserPreferences` mutation.

**Data source:** `currentUser.preferences.measurementUnit` and `currentUser.preferences.preferredSports` via GraphQL query.

**Note:** The frontend `SportType` enum in `src/lib/constants.ts` has 5 values (BASEBALL, BASKETBALL, FOOTBALL, TENNIS, PICKLEBALL). The preferred sports chips render only the sports defined in the frontend enum. Adding new sport types is out of scope for this feature.

### 3. Notifications (`/settings/notifications`)

**Fields:**
- **Enable notifications** — `FormSwitchField` toggle with description text. Auto-saves on change via `onChange` callback.
- **Email digest frequency** — `FormSelectField` with options: Daily, Weekly, Never. Save button.

**Save behavior:** Hybrid. The notifications toggle auto-saves immediately (calls `updateUserPreferences` with just `notificationsEnabled`). The email digest select uses a save button. A subtle "auto-saves" indicator appears next to auto-save fields to clarify the difference.

**Data source:** `currentUser.preferences.notificationsEnabled` and `currentUser.preferences.emailDigestFrequency` via GraphQL query.

### 4. Privacy (`/settings/privacy`)

Three sections separated by dividers:

**Section 1: Profile Visibility**
- **Profile visibility** — `FormSelectField` with options: Public, Private. (FRIENDS_ONLY was removed from the backend enum.)
- Save button for this field.

**Section 2: Visibility Controls**
- **Show online status** — `FormSwitchField` with description: "Let others see when you're active". Auto-saves.
- **Show game history** — `FormSwitchField` with description: "Display your past games on your profile". Auto-saves.
- **Show statistics** — `FormSwitchField` with description: "Display your performance stats on your profile". Auto-saves.

A subtle "auto-saves" indicator appears next to the section heading. Each toggle has its own independent `useTransition` so that saving one toggle does not disable the others.

Each switch's description is rendered as a `<FieldDescription>` with an `id`, and the switch references it via `aria-describedby` for screen reader accessibility.

**Section 3: Blocked Users**
- Reuses the existing `BlockedUsersList` component and `loadBlockedUsers` / `unblockUser` server actions.
- Renders inline within the privacy page as a section with a heading and description.
- No changes to the blocked users logic — just relocated from its standalone page.

**Data source:** Profile visibility and toggles from `currentUser.preferences` via GraphQL query. Blocked users from `loadBlockedUsers(50)` server action (same as current implementation).

---

## Data Flow

### Reading Preferences

Each settings page calls `loadUserPreferences()` independently as a Server Component. Since Next.js fetch deduplication does not apply to POST requests (which the GraphQL client uses), the function is wrapped with React `cache()` to deduplicate within a single server render pass:

```typescript
// settings/actions.ts
import { cache } from "react";

export const loadUserPreferences = cache(async () => {
  const response = await authQuery({
    me: {
      preferences: {
        measurementUnit: true,
        notificationsEnabled: true,
        emailDigestFrequency: true,
        profileVisibility: true,
        showOnlineStatus: true,
        showGameHistory: true,
        showStatistics: true,
        preferredSports: true,
      },
    },
  });
  if (response.errors?.length) return null;
  return response.data?.me?.preferences ?? null;
});
```

### Writing Preferences

#### Save-button pages (Games, Notifications email digest, Privacy visibility)

Server action calls `updateUserPreferences` with only changed fields. The mutation uses a single-member union (`UpdateUserPreferencesResult = UpdateUserPreferencesResponse`) with no error type member, so error handling uses `response.errors` (transport-level GraphQL errors), not inline error fragments:

```typescript
export async function updatePreferences(input: UpdatePreferencesInput) {
  const response = await authMutate({
    updateUserPreferences: {
      __args: { input },
      __typename: true,
      __on: [
        {
          __typeName: "UpdateUserPreferencesResponse",
          preferences: {
            measurementUnit: true,
            notificationsEnabled: true,
            emailDigestFrequency: true,
            profileVisibility: true,
            showOnlineStatus: true,
            showGameHistory: true,
            showStatistics: true,
            preferredSports: true,
          },
        },
      ],
    },
  });
  if (response.errors?.length) {
    return { success: false, message: response.errors[0].message };
  }
  const result = extractMutationResult(
    response.data.updateUserPreferences,
    "UpdateUserPreferencesResponse",
  );
  if (!result.success) return result;
  return { success: true, preferences: result.data.preferences };
}
```

The form compares current values to initial values and only sends fields that changed.

#### Auto-save toggles (Notifications enabled, Privacy visibility booleans)

Each toggle fires the same `updatePreferences` server action immediately on change, sending only the single field that changed. Uses `useTransition` for pending state. Each auto-save toggle has its own independent `useTransition` so saving one toggle doesn't disable the others.

**Rollback on failure:** If the mutation fails, the toggle reverts to its previous value. The `onChange` handler captures the previous value before mutating:

```typescript
const handleAutoSave = (fieldName: string, newValue: boolean) => {
  const previousValue = form.getFieldValue(fieldName);
  form.setFieldValue(fieldName, newValue);

  startTransition(async () => {
    const result = await updatePreferences({ [fieldName]: newValue });
    if (!result.success) {
      form.setFieldValue(fieldName, previousValue); // rollback
      toast.error(t("settings.saveError"));
    } else {
      toast.success(t("settings.saveSuccess"));
    }
  });
};
```

The toggle is disabled while `isPending` to prevent rapid toggling and out-of-order mutation resolution.

### Theme (client-side only)

Theme uses `next-themes` `setTheme()` directly. No server action or GraphQL mutation. The select triggers `setTheme(value)` on change. Requires `ThemeProvider` in root layout (see Prerequisites).

---

## New Files

```
src/app/[locale]/settings/
├── layout.tsx                    (settings shell: auth guard + sidebar + content)
├── page.tsx                      (redirects to /settings/display)
├── loading.tsx                   (skeleton for settings pages)
├── actions.ts                    (extend existing: add loadUserPreferences, updatePreferences)
├── settings-sidebar-nav.tsx      (Client Component: <nav aria-label="Settings"> with active state)
├── display/
│   ├── page.tsx                  (Server Component, renders DisplaySettingsForm)
│   └── display-settings-form.tsx (Client Component: theme + language form)
├── games/
│   ├── page.tsx                  (Server Component, renders GamesSettingsForm)
│   └── games-settings-form.tsx   (Client Component: measurement + sports form)
├── notifications/
│   ├── page.tsx                  (Server Component, renders NotificationsSettingsForm)
│   └── notifications-settings-form.tsx (Client Component: toggle + email digest form)
└── privacy/
    ├── page.tsx                  (Server Component, renders PrivacySettingsForm + BlockedUsersList)
    └── privacy-settings-form.tsx (Client Component: visibility + toggles form)
```

### Modified Files

| File | Change |
|------|--------|
| `src/app/[locale]/layout.tsx` | Add `ThemeProvider` wrapper and `suppressHydrationWarning` on `<html>` |
| `src/lib/constants.ts` | No change (preferred sports uses existing SportType values) |
| `src/components/ui/form-field.tsx` | Fix `FormSwitchField`: add `id` to Switch, add `description` and `onChange` props |
| `src/app/[locale]/settings/actions.ts` | Add `loadUserPreferences` and `updatePreferences` server actions |
| `messages/en.json` | Add settings page translations under `settings.*` |
| `tests/pages/settings-blocked.spec.ts` | Update tests to navigate to `/en/settings/privacy` and find blocked users within privacy page |

### Removed Files

| File | Reason |
|------|--------|
| `src/app/[locale]/settings/blocked/page.tsx` | Functionality moved into Privacy page |

The `BlockedUsersList` component (`src/app/[locale]/settings/blocked/blocked-users-list.tsx`) stays in its current location. The privacy page imports it from `../blocked/blocked-users-list`. Only the `page.tsx` route wrapper is deleted.

---

## Component Patterns

### Settings Form Pattern

Each settings form follows this pattern:

1. Receives initial values as props (from server component parent)
2. Uses `useForm` from TanStack Form with those defaults
3. On submit (save button) or on change (auto-save toggle):
   - Wraps mutation in `useTransition` for pending state
   - Calls server action with only changed fields
   - Shows `toast.success()` or `toast.error()` via Sonner
4. Save button shows loading state while pending

### Auto-Save Toggle Pattern

```typescript
// Inside the form, each auto-save toggle uses the onChange callback:
<form.Field name="notificationsEnabled">
  {(field) => (
    <FormSwitchField
      field={field}
      label={t("notifications.enable")}
      description={t("notifications.enableDescription")}
      disabled={isPending}
      onChange={(checked) => handleAutoSave("notificationsEnabled", checked)}
    />
  )}
</form.Field>
```

### Preferred Sports Toggles

Uses shadcn `Toggle` components (not `Badge`) for keyboard accessibility and `aria-pressed` semantics:

```typescript
{sportTypes.map((sport) => (
  <Toggle
    key={sport}
    pressed={selected.includes(sport)}
    onPressedChange={() => toggle(sport)}
  >
    {sportLabel(sport)}
  </Toggle>
))}
```

Backed by a TanStack Form field of type `SportType[]`.

---

## i18n Keys

New keys under `settings` namespace in `messages/en.json`:

```
settings.nav.display
settings.nav.games
settings.nav.notifications
settings.nav.privacy

settings.display.title
settings.display.description
settings.display.theme
settings.display.themeOptions.light
settings.display.themeOptions.dark
settings.display.themeOptions.system
settings.display.language

settings.games.title
settings.games.description
settings.games.measurementUnit
settings.games.measurementUnitOptions.metric
settings.games.measurementUnitOptions.imperial
settings.games.preferredSports
settings.games.preferredSportsDescription

settings.notifications.title
settings.notifications.description
settings.notifications.enable
settings.notifications.enableDescription
settings.notifications.emailDigest
settings.notifications.emailDigestOptions.daily
settings.notifications.emailDigestOptions.weekly
settings.notifications.emailDigestOptions.never
settings.notifications.autoSaves

settings.privacy.title
settings.privacy.description
settings.privacy.profileVisibility
settings.privacy.profileVisibilityOptions.public
settings.privacy.profileVisibilityOptions.private
settings.privacy.showOnlineStatus
settings.privacy.showOnlineStatusDescription
settings.privacy.showGameHistory
settings.privacy.showGameHistoryDescription
settings.privacy.showStatistics
settings.privacy.showStatisticsDescription

settings.saveChanges
settings.saveSuccess
settings.saveError
```

The existing `settings.blocked.*` keys remain unchanged.

---

## Private Profile Visibility — Frontend Impact

The backend now enforces partial-User masking when a user's `profileVisibility` is `PRIVATE` and the viewer is not a follower. `firstName`, `lastName`, and `biography` are nulled out. `profileVisibility` is exposed as a field on the `User` GraphQL type (via `@BatchMapping`).

See: `playground-backend/.claudedoc/feature-0079-account-settings/private-profile-visibility-design.md`

### Type Changes

`firstName` and `lastName` on `User` are now `String` (nullable) instead of `String!`. All frontend types that represent a `User` from the GraphQL API (not `CurrentUser`) must update:

| Type / Interface | File | Change |
|-----------------|------|--------|
| `ProfileHeaderProps.user` | `src/components/profile/profile-header.tsx` | `firstName: string \| null`, `lastName: string \| null` |
| `ProfileAvatarProps.user` | `src/components/profile/profile-avatar.tsx` | `firstName: string \| null`, `lastName: string \| null` |
| `UserSearchNode` | `src/lib/types/user.ts` | `firstName: string \| null`, `lastName: string \| null` |
| `ChatUser` | `src/lib/types/chat.ts` | `firstName: string \| null`, `lastName: string \| null` |
| `GameMemberUser` | `src/lib/types/game.ts` | `firstName: string \| null`, `lastName: string \| null`, add `displayName: string` |

`GameMemberUser` also needs `displayName` added — the `gameMemberSelection` query in `src/app/[locale]/game/actions.ts` must add `displayName: true` to enable the fallback pattern.

**Not changed:** `CurrentUserInfo` in `src/components/auth/actions.ts` — the `me` query always returns full data for the authenticated user.

### Initials Utility

Two shared helpers in `src/lib/utils.ts` that safely handle nullable fields:

```typescript
/** Safely compute avatar initials from a user with potentially null name fields. */
export function getInitials(user: { firstName?: string | null; lastName?: string | null; displayName: string }): string {
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
export function getFullName(user: { firstName?: string | null; lastName?: string | null; displayName: string }): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  return user.displayName;
}
```

All files currently computing initials inline (`profile-header.tsx`, `profile-avatar.tsx`, `message-bubble.tsx`) switch to `getInitials`.

### Full Name Display

Files that display `${firstName} ${lastName}` (manage-editors-dialog, member-list-panel, invite-players-dialog) switch to `getFullName`. `displayName` is always present as the fallback.

### Profile Page Gating

The user profile page (`src/app/[locale]/user/[username]/page.tsx`) adds `profileVisibility` to `buildUserQuery()`. When `profileVisibility === "PRIVATE"` and `viewerFollowsUser` is not `true`:

- **Don't render** `PlayerStats` or `PlayerStatsEditorLoader`
- **Don't render** `GameHistorySection` (skip the Suspense boundary entirely)
- **Show** an informational notice card in place of the hidden sections

The backend still returns `player`, `followerCount`, `followingCount`, `displayName`, `profilePicture`, and `viewerFollowsUser` for private profiles — these are always visible. The follow button in `ProfileHeader` (already rendered above the notice) is the action point for following — the notice itself is informational only.

For **own profile** (`isOwnProfile`), all sections render regardless of visibility setting — the user always sees their own full profile.

### i18n Keys

```
profile.privateProfile.title      → "This account is private"
profile.privateProfile.description → "This account's full profile is only visible to followers"
```

---

## What Is NOT In Scope

- Mobile-optimized settings experience (native app handles mobile)
- Account deletion / data export
- Connected accounts management
- Password change (handled by Keycloak)
- Email/username change
- Settings search
- Undo for auto-save toggles
