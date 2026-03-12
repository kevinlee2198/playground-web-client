import { TypographySmall } from "../ui/typography";

export function SkipNavLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TypographySmall>Skip to main content</TypographySmall>
    </a>
  );
}
