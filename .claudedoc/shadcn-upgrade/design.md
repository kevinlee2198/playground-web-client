# shadcn Upgrade — Implementation Plan

Branch: `0100-shadcn-upgrade`. Baseline commit `509b505` bumps `@base-ui/react` 1.3.0 → 1.6.0 and `shadcn` 4.1.0 → 4.14.1.

The project was initialized on the Base UI platform (`base-vega` style), so this is a refresh, not a migration. The upgrade has three parts:

1. **Dependency bump** — done. No breaking changes apply to us (the only Base UI 1.4–1.6 breaking change is an OTPField rename; we don't use OTPField). Because `globals.css` already imports `shadcn/tailwind.css`, the bump also delivered the new `scroll-fade-*` and `shimmer` CSS utilities.
2. **Registry component refresh** — merge upstream changes into `src/components/ui/` while preserving local customizations (below).
3. **Optional adoptions** — Base UI Toast (replacing sonner) and the chat components (replacing parts of our hand-rolled chat UI). Each can be its own follow-up branch.

## Local customizations that must survive the refresh

- **`font-heading`** — a local typography system (`--font-heading` theme token + `.font-heading` utility in `globals.css`, used in 16 files). We added `font-heading` to `AlertTitle` (alert.tsx) and `PopoverTitle` (popover.tsx); upstream does not have it. **Keep it.**
- **`button-variants.ts` split** — `buttonVariants` was extracted out of `button.tsx` into its own file, imported by 10 files (pages, navbar, chat-room-list, game-history, …). Upstream instead inlines the cva in `button.tsx` and exports `buttonVariants` from there. **Keep the split**; update the cva content inside `button-variants.ts` and additionally re-export `buttonVariants` from `button.tsx` so future registry components (e.g. upstream calendar) that import it from `button` resolve without edits.
- **Custom files not managed by the registry** — `typography.tsx`, `form-field.tsx`, `date-time-picker.tsx`, `user-avatar.tsx`. Not overwritten by the CLI, but they compose registry parts (field, calendar, popover, avatar), so re-verify them after the refresh.

## Component-by-component

Full diffs: generated via `npx shadcn@latest add <c> --diff src/components/ui/<c>.tsx` (shadcn 4.14.1, 2026-07-23).

### No action — identical or formatting-only (8)

`badge`, `checkbox`, `label`, `radio-group`, `separator`, `skeleton`, `switch`, `textarea`

Upstream differs only in spacing/quotes/semicolons. Overwriting creates churn with zero benefit. Skip.

### Cosmetic only — import/export ordering or class-string reflow (11)

`avatar`, `collapsible`, `combobox`, `dropdown-menu`, `empty`, `input`, `input-group`, `scroll-area`, `select`, `sonner`, `tooltip`

Semantically identical to upstream (our lint reordered imports/exports; the CLI reflowed long class strings). Skip — these count as "already up to date".

### Real upstream changes — adopt (11)

| Component | Change | Risk |
| --- | --- | --- |
| `button` | New styles (`hover:bg-primary/80`, restyled `destructive`/`secondary`/`outline`), new sizes `xs`, `icon-xs`, `icon-sm`, `icon-lg`, icon-aware padding (`has-data-[icon=…]`), exports `buttonVariants`. Merge into `button-variants.ts` (keep split, see above). | Visual: every button's hover/active states change subtly. Review app-wide. |
| `card` | Padding refactored to a `--card-spacing` variable (`[--card-spacing:--spacing(6)]`, `sm` → 4). Same rendered spacing; enables per-card spacing override. | Low. Fixture cards (0099 redesign) use Card — spot-check. |
| `calendar` | ClassNames key `table:` → `month_grid:` (correct key — our old key silently no-oped), import cleanup. **Pulls react-day-picker 9 → 10 (major)** as its registry dependency; the only app breakage was `initialFocus` (removed upstream) → `autoFocus` in `game-list-filters.tsx`. | Medium: verify `date-time-picker.tsx` + game list date filters render/focus correctly. |
| `dialog` | Content surface `bg-background` → `bg-popover` + `text-popover-foreground`. | Visual only if the theme distinguishes popover from background tokens. |
| `alert-dialog` | Same token change as dialog. | Same. |
| `sheet` | Same token change as dialog. | Same. |
| `tabs` | Trigger gains icon-aware padding (`has-data-[icon=…]`). | None visible without icons in tabs. |
| `toggle` | Sizes gain icon-aware padding; default size `px-2` → `px-2.5`. | Tiny width change. No direct app usage found. |
| `toggle-group` | Default `spacing` 0 → 2 (segmented → gapped look); icon-aware padding. | Zero impact today — no app call sites. Future ToggleGroups get the new default. |
| `table` | Row gains `has-aria-expanded:bg-muted/50`. | None for current tables. |
| `navigation-menu` | Trigger drops `bg-background` (now transparent); link `rounded-sm` → `rounded-md` with context-aware rounding; exports reordered. | Check navbar rendering on non-default backgrounds. |
| `field` | `FieldTitle` drops `leading-snug` (adopted). Upstream also deletes the `has-[[data-slot=radio-group-item]]` card styling on `FieldLabel` — **kept as a local customization**: `visibility-radio-group.tsx` and `stat-entry-mode-radio-group.tsx` rely on it for their bordered radio-card look. | Check forms + `form-field.tsx`. |

### Merge manually — local customization collides (2)

- `alert` — take upstream export reorder if desired, **keep `font-heading`** on AlertTitle.
- `popover` — **keep `font-heading`** on PopoverTitle; rest is cosmetic.

Process per component: `npx shadcn@latest add <c> --diff src/components/ui/<c>.tsx`, hand-apply (no `--overwrite`), then `npm run build && npm run lint`.

## Toast: sonner → Base UI Toast (optional, recommended)

Current state: `sonner@2.0.7` + wrapper `src/components/ui/sonner.tsx` (theme + custom lucide icons), mounted in `src/app/[locale]/layout.tsx`. Usage across **57 files**: `toast.error` ×104, `toast.success` ×67, bare `toast()` ×3. No `toast.promise`, no custom JSX toasts — the entire surface is two methods.

New Base UI Toast (`npx shadcn@latest add toast`): `<Toaster />` in layout, `toast.add({ title, description, type })`, `toast.promise()`, actions via `actionProps`, native stacking/swipe, styled by our theme tokens directly (no CSS-variable bridge like the sonner wrapper needs).

Migration (mechanical):

1. `add toast`, swap `<Toaster />` import in layout.
2. Codemod call sites: `toast.success(msg)` → `toast.add({ title: msg, type: "success" })`, same for `error`; 3 bare `toast(msg)` → `toast.add({ title: msg })`. Second-arg `{ description }` options carry over as `description`.
3. Remove `sonner.tsx`, drop `sonner` from package.json.

Payoff: −1 runtime dep, toasts styled natively by the theme. Cost: a wide but shallow diff (57 files). Recommend doing it as its own commit (or follow-up branch) after the component refresh, verified with the Playwright suite since many specs likely assert toast text.

## Chat: hand-rolled UI → shadcn chat components (optional, evaluate)

Current implementation in `src/components/chat/` overlaps heavily with the new components:

| Ours | Hand-rolls | shadcn equivalent |
| --- | --- | --- |
| `message-list.tsx` | Auto-scroll on mount/new message, near-bottom tracking, "new messages" indicator button, scroll-position preservation when prepending older pages, IntersectionObserver reverse infinite scroll — ~180 lines of effect code on top of ScrollArea | `MessageScroller` (Provider/Viewport/Content/Item/Button + `useMessageScrollerVisibility`) |
| `message-bubble.tsx` | Row layout, avatar grouping, alignment, hover timestamps | `Message` |
| bubble surface inside `message-bubble.tsx` | Own/other variants, deleted state, reply preview | `Bubble` |
| media rendering inside `message-bubble.tsx` | Image/video/file cards, download links, file size | `Attachment` |
| `system-message-bubble.tsx` | System notes | `Marker` |

Notes from inspecting the registry source (`npx shadcn@latest view @shadcn/message-scroller`):

- Adds a new runtime dep **`@shadcn/react`** (headless behavior package) — installed automatically by the CLI.
- Uses `scroll-fade-b`, `scrollbar-thin` utilities — already available via our `shadcn/tailwind.css` import after the version bump.
- `MessageScrollerButton` defaults to `size="icon-sm"` and `AttachmentAction` to `size="icon-xs"` — **both require the new button sizes**, so the button refresh above is a prerequisite.

### Attachment applies beyond chat

`Attachment` (view: `npx shadcn@latest view @shadcn/attachment`) is a general file-chip component with first-class upload lifecycle — `state="idle" | "uploading" | "processing" | "error" | "done"` (dashed border while idle, `shimmer` on the title while uploading/processing, destructive styling on error), `AttachmentMedia` (icon or image thumbnail), `AttachmentTitle`/`AttachmentDescription`, `AttachmentActions`, `AttachmentTrigger` (full-surface press target), and `AttachmentGroup` (horizontal snap-scroll strip with `scroll-fade-x`). Candidate replacements:

| Surface | Fit |
| --- | --- |
| `chat-attachment-preview.tsx` (pre-send preview in message input) | Near 1:1 — thumbnail box + truncated name + size + error text + remove button is exactly the Attachment anatomy. Gains uploading shimmer + error state styling for free. |
| `game-media-upload-placeholder.tsx` (in-gallery uploading/error tile) | Direct — its two statuses are literally Attachment states; use `orientation="vertical"` + `aspect-square` className for the tile shape. |
| `message-bubble.tsx` file/download card (done state in chat) | Good — part of the chat adoption above. |
| `game-media-item.tsx` (done-state gallery tiles) | Poor — embedded players, play overlays, hover-delete make these media tiles, not file chips. Keep custom. |
| Profile picture upload flow | Poor — crop/preview dialog, not an attachment chip. Keep custom. |

The first two are small, self-contained swaps and could ride along with the component-refresh branch after the button update lands; they don't require adopting any other chat component (Attachment's only registry dependency is button).

Recommendation: do **not** rewrite the working chat wholesale. Highest-value first step is replacing `message-list.tsx`'s scroll machinery with `MessageScroller` — that's where our maintenance burden is (5 effects, observer lifecycle, scroll-height bookkeeping). `Message`/`Bubble`/`Attachment`/`Marker` adoption is a cosmetic consolidation that can follow incrementally, and our domain logic (editing, replies, roles, deletion) stays in our components either way. Treat as a separate feature branch with its own requirements pass.

## Typeset: evaluated, not adopted (2026-07-23)

Upstream context: ui.shadcn.com's old **Typography docs page** — the h1–h4/p/blockquote copy-paste styles that our `typography.tsx` componentizes — has been replaced by the typeset docs. Upstream's story for prose/content styling is now typeset (one CSS file, container-responsive `--typeset-size`/`--typeset-leading`/`--typeset-flow`, theme-token integrated, streaming-safe).

Why we're not adopting it:

- Typeset's own docs scope it to **rendered markdown/HTML content containers** ("wrap your rendered markdown with `typeset`"); components opt *out* via `not-typeset`. It is explicitly not for app UI text.
- `typography.tsx` has **56 importers**, overwhelmingly UI text (TypographyMuted labels/captions, headings in app chrome) — outside typeset's scope. CLAUDE.md mandates these components for all text.
- The only document-like surfaces are the four static `/resource/*` pages (about, contact, FAQ, get-started), authored as JSX with i18n strings — not rendered markdown. Converting them to bare HTML inside a `.typeset` wrapper is churn without user-visible benefit.
- We render no markdown anywhere (no markdown library, no `dangerouslySetInnerHTML`).

Decision: keep `typography.tsx`. Note that upstream will no longer maintain the style recipes it was copied from — it is now fully ours. Revisit typeset if we add real rendered content: markdown in chat messages (typeset's container-responsive scaling targets exactly the chat-bubble case), formatted bios, or CMS/blog content.

### typography.tsx fixes (in scope for this branch)

Since the file is now fully ours (see above), two known defects to fix as part of this upgrade:

1. **No polymorphism.** Every component renders a fixed tag — `TypographyMuted`/`TypographyLead` always emit `<p>`, `TypographyLarge` a `<div>`. When used as an inline label (e.g. inside a flex row), the emitted `<p>` is semantically wrong and invalid as a child of another `<p>`. Fix: support tag override — either an `as`/`render` prop on the existing components (Base UI's `useRender` is already in the dep tree and is how the registry's own components do it) or consolidate into one polymorphic `<Text as variant>`. Keep the existing named exports as thin wrappers so the 56 importers don't churn.
2. **`TypographyP` bakes in document-flow spacing** (`[&:not(:first-child)]:mt-6`). That's prose margin living in an app primitive, and it fights the project rule of gap-based layout (`flex flex-col gap-*`). Fix: strip the margin from the base component and let containers own spacing via `gap-*`; the four `/resource/*` pages that rely on the flow spacing wrap their content in a `flex flex-col gap-6` (or keep a deliberately-named `TypographyProse` variant for document contexts). Audit `TypographyP` call sites when doing this — some may depend on the margin today.

In scope for this branch as its own commit (after the registry refresh), so the typography diff stays separately reviewable.

## Suggested commit sequence

1. ~~`chore(deps)`: version bumps~~ (done, `509b505`)
2. `refactor(ui)`: button + button-variants refresh (new sizes/styles, re-export) — prerequisite for everything else
3. `chore(ui)`: adopt remaining registry updates (card, calendar, dialog, alert-dialog, sheet, tabs, toggle, toggle-group, table, navigation-menu, field; preserve font-heading in alert/popover)
4. `refactor(ui)`: typography.tsx fixes — polymorphism (`as`/`render` support, keep named exports as wrappers) and `TypographyP` margin removal with call-site audit (see typeset section)
5. Verify: `npm run build`, `npm run lint`, Playwright suite, visual pass over navbar/dialogs/forms/fixture cards/resource pages
6. Optional follow-ups (separate branches): toast migration; chat `MessageScroller` adoption; `Attachment` swaps (chat preview + game media placeholder)
