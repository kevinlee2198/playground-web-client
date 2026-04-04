import type { SportType } from "@/lib/constants";
import type { ReactNode } from "react";

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
} as const;

const sportPaths: Record<SportType, ReactNode> = {
  BASEBALL: (
    <>
      <path d="M2 12c5.5 0 10-4.5 10-10" />
      <circle cx="12" cy="12" r="10" />
      <path d="M22 12c-5.5 0-10 4.5-10 10" />
      <path d="m8 11.5-1.5-2" />
      <path d="m11.5 8-2-1.5" />
      <path d="m14.5 17.5-2-1.5" />
      <path d="m17.5 14.5-1.5-2" />
    </>
  ),
  BASKETBALL: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2.1 13.4A10.1 10.1 0 0 0 13.4 2.1" />
      <path d="m5 4.9 14 14.2" />
      <path d="M21.9 10.6a10.1 10.1 0 0 0-11.3 11.3" />
    </>
  ),
  FOOTBALL: (
    <>
      <path d="M21 3c-.8-.8-3-1.2-5.8-.9s-6 1.6-8.8 4.4-4 6-4.4 8.8.1 5 .9 5.8 3 1.2 5.8.9 6-1.6 8.8-4.4 4-6 4.4-8.8-.1-5-.9-5.8" />
      <path d="M6.4 17.6 9 15" />
      <path d="M8.7 21.9c-.8-3.3-3.4-5.8-6.7-6.7" />
      <path d="m8.1 13.9 2 2" />
      <path d="m11 11 2 2" />
      <path d="m13.9 8.1 2 2" />
      <path d="M15.3 2.1c.8 3.3 3.4 5.8 6.6 6.6" />
      <path d="m15 9 2.6-2.6" />
    </>
  ),
  TENNIS: (
    <>
      <path d="M10.7 4.7c3-3 7.4-3.6 9.8-1.2s1.8 6.8-1.2 9.8a9.5 9.5 0 0 1-4.3 2.5c-2.1.5-4.1.1-5.5-1.3S7.7 11.1 8.2 9a9.5 9.5 0 0 1 2.5-4.3" />
      <path d="M8.2 9 6 18l9-2.2" />
      <path d="m2 22 4-4" />
      <circle cx="20" cy="20" r="2" />
    </>
  ),
  PICKLEBALL: (
    <>
      <ellipse cx="11" cy="9" rx="6" ry="7" />
      <line x1="11" y1="16" x2="11" y2="22" />
      <circle cx="20" cy="19" r="2" />
    </>
  ),
};

interface SportIconProps {
  sportType: SportType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SportIcon({ sportType, size = "md", className }: SportIconProps) {
  const px = sizeMap[size];

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {sportPaths[sportType]}
    </svg>
  );
}
