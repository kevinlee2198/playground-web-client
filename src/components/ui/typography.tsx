import { cn } from "@/lib/utils";
import { ElementType, ReactNode } from "react";

interface TypographyProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Override the rendered element, e.g. `as="span"` for inline contexts. */
  as?: ElementType;
}

export function TypographyH1({
  children,
  className,
  as: Tag = "h1",
}: TypographyProps) {
  return (
    <Tag
      className={cn(
        "scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance font-heading",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyH2({
  children,
  className,
  id,
  as: Tag = "h2",
}: TypographyProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 text-pretty font-heading",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyH3({
  children,
  className,
  as: Tag = "h3",
}: TypographyProps) {
  return (
    <Tag
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight text-pretty font-heading",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyH4({
  children,
  className,
  as: Tag = "h4",
}: TypographyProps) {
  return (
    <Tag
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight text-pretty font-heading",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyH5({
  children,
  className,
  as: Tag = "h5",
}: TypographyProps) {
  return (
    <Tag
      className={cn(
        "scroll-m-4 text-lg font-semibold tracking-tight text-pretty font-heading",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyP({
  children,
  className,
  as: Tag = "p",
}: TypographyProps) {
  return <Tag className={cn("leading-7", className)}>{children}</Tag>;
}

export function TypographyBlockquote({
  children,
  className,
  as: Tag = "blockquote",
}: TypographyProps) {
  return (
    <Tag className={cn("mt-6 border-l-2 pl-6 italic", className)}>
      {children}
    </Tag>
  );
}

export function TypographyInlineCode({
  children,
  className,
  as: Tag = "code",
}: TypographyProps) {
  return (
    <Tag
      className={cn(
        "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TypographyLead({
  children,
  className,
  as: Tag = "p",
}: TypographyProps) {
  return (
    <Tag className={cn("text-muted-foreground text-xl", className)}>
      {children}
    </Tag>
  );
}

export function TypographyLarge({
  children,
  className,
  as: Tag = "div",
}: TypographyProps) {
  return <Tag className={cn("text-lg font-semibold", className)}>{children}</Tag>;
}

export function TypographySmall({
  children,
  className,
  as: Tag = "small",
}: TypographyProps) {
  return (
    <Tag className={cn("text-sm leading-none font-medium", className)}>
      {children}
    </Tag>
  );
}

export function TypographyMuted({
  children,
  className,
  as: Tag = "p",
}: TypographyProps) {
  return (
    <Tag className={cn("text-muted-foreground text-sm", className)}>
      {children}
    </Tag>
  );
}
