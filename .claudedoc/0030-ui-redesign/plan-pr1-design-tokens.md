# PR 1: Design Tokens — Ghibli Tranquil Theme

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic grayscale theme with the approved Ghibli Tranquil design tokens — fonts, colors, radius, and shadows.

**Architecture:** All shadcn components reference CSS variables (`bg-primary`, `text-foreground`, etc.), so swapping the `:root` values in `globals.css` cascades everywhere automatically. Fonts are loaded via `next/font/google` in `layout.tsx`. Typography components get a `font-display` class for headings. Sport-specific accent tokens are added as new custom properties.

**Tech Stack:** CSS variables (OKLCH), Tailwind v4 `@theme inline`, `next/font/google`

---

### Task 1: Swap font imports in layout.tsx

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

**Step 1: Replace font imports and instantiation**

Replace Inter, Geist, and Geist_Mono with Quicksand and Nunito:

```tsx
import { Quicksand, Nunito } from "next/font/google";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});
```

**Step 2: Update HTML/body classes**

```tsx
<html lang={locale} className={`${quicksand.variable} ${nunito.variable}`}>
  <body className="antialiased min-h-screen flex flex-col">
```

**Step 3: Update metadata**

```tsx
export const metadata: Metadata = {
  title: "Playground",
  description: "Where friends come to play",
};
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (fonts load, no missing variable errors)

**Step 5: Commit**

```bash
git add src/app/[locale]/layout.tsx
git commit -m "feat(theme): swap fonts to Quicksand + Nunito"
```

---

### Task 2: Update CSS variables and Tailwind theme

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update `@theme inline` block**

Replace font references and add sport accent tokens:

```css
@theme inline {
  /* Fonts */
  --font-sans: var(--font-body);
  --font-display: var(--font-display);

  /* Semantic colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Sport accents */
  --color-sport-basketball: var(--sport-basketball);
  --color-sport-basketball-foreground: var(--sport-basketball-foreground);
  --color-sport-tennis: var(--sport-tennis);
  --color-sport-tennis-foreground: var(--sport-tennis-foreground);
  --color-sport-football: var(--sport-football);
  --color-sport-football-foreground: var(--sport-football-foreground);

  /* Live indicator */
  --color-live: var(--live);
  --color-live-foreground: var(--live-foreground);

  /* Radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}
```

**Step 2: Replace `:root` color values with Ghibli palette**

```css
:root {
  /* Base surfaces */
  --background: oklch(0.96 0.018 85);        /* #faf3e6 cream */
  --foreground: oklch(0.28 0.03 55);          /* #3d3426 warm charcoal */
  --card: oklch(0.99 0.006 85);              /* #fffdf8 warm white */
  --card-foreground: oklch(0.28 0.03 55);     /* same as foreground */
  --popover: oklch(0.99 0.006 85);
  --popover-foreground: oklch(0.28 0.03 55);

  /* Primary — Forest green */
  --primary: oklch(0.58 0.10 155);            /* #5a8a6e */
  --primary-foreground: oklch(0.99 0.006 85); /* warm white */

  /* Secondary — Deep cream */
  --secondary: oklch(0.93 0.022 80);          /* #f5ecda */
  --secondary-foreground: oklch(0.28 0.03 55);

  /* Muted */
  --muted: oklch(0.93 0.022 80);              /* deep cream */
  --muted-foreground: oklch(0.53 0.02 60);    /* #7a7060 warm gray */

  /* Accent — Terracotta */
  --accent: oklch(0.60 0.12 45);              /* #c4785a */
  --accent-foreground: oklch(0.99 0.006 85);

  /* Destructive (unchanged concept, warmed slightly) */
  --destructive: oklch(0.58 0.22 27);

  /* Borders & inputs */
  --border: oklch(0.28 0.03 55 / 10%);        /* warm transparent border */
  --input: oklch(0.28 0.03 55 / 10%);
  --ring: oklch(0.58 0.10 155);               /* forest green ring */

  /* Sport accents */
  --sport-basketball: oklch(0.92 0.04 45);    /* #f5e0d8 blush */
  --sport-basketball-foreground: oklch(0.60 0.12 45); /* terracotta */
  --sport-tennis: oklch(0.92 0.04 135);       /* #e8edd4 moss */
  --sport-tennis-foreground: oklch(0.58 0.10 155);    /* forest */
  --sport-football: oklch(0.92 0.03 220);     /* #dce8ef sky */
  --sport-football-foreground: oklch(0.55 0.08 230);  /* sky blue */

  /* Live indicator */
  --live: oklch(0.60 0.14 45);                /* warm terracotta, deeper */
  --live-foreground: oklch(0.99 0.006 85);

  /* Chart colors (nature-inspired) */
  --chart-1: oklch(0.58 0.10 155);            /* forest */
  --chart-2: oklch(0.60 0.12 45);             /* terracotta */
  --chart-3: oklch(0.55 0.08 230);            /* sky */
  --chart-4: oklch(0.65 0.10 85);             /* gold */
  --chart-5: oklch(0.50 0.08 310);            /* plum */

  /* Radius — larger for Ghibli rounded feel */
  --radius: 0.875rem;

  /* Sidebar (not actively used but keep consistent) */
  --sidebar: oklch(0.96 0.018 85);
  --sidebar-foreground: oklch(0.28 0.03 55);
  --sidebar-primary: oklch(0.58 0.10 155);
  --sidebar-primary-foreground: oklch(0.99 0.006 85);
  --sidebar-accent: oklch(0.93 0.022 80);
  --sidebar-accent-foreground: oklch(0.28 0.03 55);
  --sidebar-border: oklch(0.28 0.03 55 / 10%);
  --sidebar-ring: oklch(0.58 0.10 155);
}
```

**Step 3: Update `.dark` to be a warmer evening variant**

```css
.dark {
  --background: oklch(0.20 0.02 55);
  --foreground: oklch(0.93 0.018 85);
  --card: oklch(0.24 0.02 55);
  --card-foreground: oklch(0.93 0.018 85);
  --popover: oklch(0.24 0.02 55);
  --popover-foreground: oklch(0.93 0.018 85);
  --primary: oklch(0.65 0.10 155);
  --primary-foreground: oklch(0.20 0.02 55);
  --secondary: oklch(0.28 0.02 55);
  --secondary-foreground: oklch(0.93 0.018 85);
  --muted: oklch(0.28 0.02 55);
  --muted-foreground: oklch(0.65 0.02 60);
  --accent: oklch(0.65 0.12 45);
  --accent-foreground: oklch(0.20 0.02 55);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.93 0.018 85 / 10%);
  --input: oklch(0.93 0.018 85 / 15%);
  --ring: oklch(0.65 0.10 155);

  --sport-basketball: oklch(0.35 0.04 45);
  --sport-basketball-foreground: oklch(0.75 0.10 45);
  --sport-tennis: oklch(0.35 0.04 135);
  --sport-tennis-foreground: oklch(0.70 0.10 155);
  --sport-football: oklch(0.35 0.03 220);
  --sport-football-foreground: oklch(0.70 0.08 230);

  --live: oklch(0.70 0.14 45);
  --live-foreground: oklch(0.20 0.02 55);

  --chart-1: oklch(0.65 0.10 155);
  --chart-2: oklch(0.65 0.12 45);
  --chart-3: oklch(0.60 0.08 230);
  --chart-4: oklch(0.70 0.10 85);
  --chart-5: oklch(0.55 0.08 310);

  --sidebar: oklch(0.20 0.02 55);
  --sidebar-foreground: oklch(0.93 0.018 85);
  --sidebar-primary: oklch(0.65 0.10 155);
  --sidebar-primary-foreground: oklch(0.20 0.02 55);
  --sidebar-accent: oklch(0.28 0.02 55);
  --sidebar-accent-foreground: oklch(0.93 0.018 85);
  --sidebar-border: oklch(0.93 0.018 85 / 10%);
  --sidebar-ring: oklch(0.65 0.10 155);
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): apply Ghibli Tranquil color palette, radius, and sport tokens"
```

---

### Task 3: Update Typography component for display font

**Files:**
- Modify: `src/components/ui/typography.tsx`

**Step 1: Add `font-display` to all heading components**

All heading components (H1–H5) should use Quicksand via the `font-display` class.
Body components (P, Lead, Large, Small, Muted) stay on the default body font (Nunito).

Update each heading to include `font-display` in the class list.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/typography.tsx
git commit -m "feat(theme): use display font (Quicksand) for heading typography"
```

---

### Task 4: Verify everything works together

**Step 1: Run full build + lint**

```bash
npm run build && npm run lint
```

Expected: Both pass with no errors.

**Step 2: Visual spot check**

Run `npm run dev` and verify:
- Cream background visible on all pages
- Forest green primary buttons and links
- Rounded corners noticeably larger
- Quicksand on headings, Nunito on body text
- Cards have warm white background
- No color contrast issues on text

**Step 3: Push and open PR**
