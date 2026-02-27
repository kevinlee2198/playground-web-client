"use client";

import {
  Atkinson_Hyperlegible_Next,
  Atkinson_Hyperlegible_Mono,
} from "next/font/google";
import { useState } from "react";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-main",
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/* ─── colorway definitions ─── */

type Colorway = {
  name: string;
  description: string;
  inspiration: string;
  primary: string;
  primarySoft: string;
  primaryGlow: string;
  primaryText: string;
  primaryOnCream: string;
  live: string;
  liveSoft: string;
};

const COLORWAYS: Record<string, Colorway> = {
  twilight: {
    name: "Twilight",
    description: "Warm indigo pulled from Ghibli evening skies",
    inspiration: "Spirited Away bathhouse dusk, Howl\u2019s Moving Castle sunsets",
    primary: "oklch(0.48 0.14 275)",
    primarySoft: "oklch(0.48 0.14 275 / 12%)",
    primaryGlow: "oklch(0.48 0.14 275 / 22%)",
    primaryText: "oklch(0.98 0.01 275)",
    primaryOnCream: "oklch(0.42 0.14 275)",
    live: "oklch(0.68 0.14 25)",
    liveSoft: "oklch(0.68 0.14 25 / 14%)",
  },
  clay: {
    name: "Clay",
    description: "Terracotta warmth from Mediterranean rooftops",
    inspiration: "Kiki\u2019s Delivery Service bakery, Porco Rosso coastlines",
    primary: "oklch(0.55 0.13 35)",
    primarySoft: "oklch(0.55 0.13 35 / 12%)",
    primaryGlow: "oklch(0.55 0.13 35 / 22%)",
    primaryText: "oklch(0.98 0.01 35)",
    primaryOnCream: "oklch(0.48 0.14 35)",
    live: "oklch(0.60 0.18 25)",
    liveSoft: "oklch(0.60 0.18 25 / 14%)",
  },
  ocean: {
    name: "Ocean",
    description: "Deep teal from coastal Ghibli worlds",
    inspiration: "Ponyo\u2019s sea, Spirited Away river spirit, Nausicaä skies",
    primary: "oklch(0.48 0.10 220)",
    primarySoft: "oklch(0.48 0.10 220 / 12%)",
    primaryGlow: "oklch(0.48 0.10 220 / 22%)",
    primaryText: "oklch(0.98 0.01 220)",
    primaryOnCream: "oklch(0.42 0.11 220)",
    live: "oklch(0.65 0.15 30)",
    liveSoft: "oklch(0.65 0.15 30 / 14%)",
  },
  plum: {
    name: "Plum",
    description: "Dusty violet from wildflower fields",
    inspiration: "Howl\u2019s flower meadow, Arrietty\u2019s garden",
    primary: "oklch(0.50 0.13 310)",
    primarySoft: "oklch(0.50 0.13 310 / 12%)",
    primaryGlow: "oklch(0.50 0.13 310 / 22%)",
    primaryText: "oklch(0.98 0.01 310)",
    primaryOnCream: "oklch(0.44 0.14 310)",
    live: "oklch(0.65 0.16 25)",
    liveSoft: "oklch(0.65 0.16 25 / 14%)",
  },
  meadow: {
    name: "Meadow",
    description: "Soft sage pulled from sunlit hillsides",
    inspiration: "Totoro\u2019s hilltop, Arrietty\u2019s garden path, Howl\u2019s meadow",
    primary: "oklch(0.62 0.10 155)",
    primarySoft: "oklch(0.62 0.10 155 / 12%)",
    primaryGlow: "oklch(0.62 0.10 155 / 22%)",
    primaryText: "oklch(0.98 0.01 155)",
    primaryOnCream: "oklch(0.46 0.10 155)",
    live: "oklch(0.65 0.15 30)",
    liveSoft: "oklch(0.65 0.15 30 / 14%)",
  },
};

/* ─── shared palette (stays the same across colorways) ─── */

const BASE = {
  cream: "oklch(0.96 0.018 85)",
  creamDeep: "oklch(0.93 0.022 80)",
  white: "oklch(0.995 0.003 85)",
  text: "oklch(0.24 0.03 55)",
  textSecondary: "oklch(0.50 0.02 60)",
  border: "oklch(0.24 0.03 55 / 8%)",
  shadow: "oklch(0.24 0.03 55 / 6%)",
  shadowHover: "oklch(0.24 0.03 55 / 12%)",
};

/* ─── sport accents (pastel, unchanged) ─── */

const SPORTS = {
  basketball: {
    label: "Basketball",
    icon: "\u{1F3C0}",
    accent: "oklch(0.72 0.10 50)",
    accentSoft: "oklch(0.72 0.10 50 / 14%)",
    accentText: "oklch(0.50 0.10 50)",
  },
  football: {
    label: "Football",
    icon: "\u{1F3C8}",
    accent: "oklch(0.68 0.09 145)",
    accentSoft: "oklch(0.68 0.09 145 / 14%)",
    accentText: "oklch(0.42 0.09 145)",
  },
  tennis: {
    label: "Tennis",
    icon: "\u{1F3BE}",
    accent: "oklch(0.85 0.09 95)",
    accentSoft: "oklch(0.85 0.09 95 / 20%)",
    accentText: "oklch(0.50 0.09 95)",
  },
} as const;

/* ─── mock data ─── */

const MOCK_GAMES = [
  {
    sport: "basketball" as const,
    subtype: "5v5",
    teamA: "Squad Alpha",
    teamB: "Night Owls",
    scoreA: 72,
    scoreB: 68,
    status: "FINAL",
    location: "Riverside Park, Portland",
    date: "Feb 24, 7:00 PM",
    friends: ["S", "K", "M"],
    friendNames: "Sarah, Kevin, and 1 other",
    media: 4,
  },
  {
    sport: "football" as const,
    subtype: "Flag",
    teamA: "Red Zone",
    teamB: "Blitz",
    scoreA: 28,
    scoreB: 35,
    status: "FINAL",
    location: "Grant High School",
    date: "Feb 22, 3:00 PM",
    friends: ["J", "D"],
    friendNames: "Jake and Dan",
    media: 2,
  },
  {
    sport: "tennis" as const,
    subtype: "Singles",
    teamA: "A. Ruiz",
    teamB: "M. Chen",
    scoreA: 2,
    scoreB: 1,
    status: "FINAL",
    location: "Sunset Tennis Club",
    date: "Feb 20, 10:00 AM",
    friends: ["A"],
    friendNames: "Alex played",
    media: 0,
  },
  {
    sport: "basketball" as const,
    subtype: "3v3",
    teamA: "Home",
    teamB: "Away",
    scoreA: 14,
    scoreB: 11,
    status: "LIVE",
    location: "Lincoln Park Courts",
    date: "Now",
    friends: ["T", "R", "J", "L"],
    friendNames: "Tyler, Ravi, and 2 others",
    media: 1,
  },
];

const BOX_SCORE_ROWS = [
  { name: "K. Lee", pts: 22, reb: 8, ast: 5, stl: 3, blk: 1, fgp: "52%" },
  { name: "S. Park", pts: 18, reb: 4, ast: 9, stl: 1, blk: 0, fgp: "44%" },
  { name: "M. Jones", pts: 15, reb: 11, ast: 2, stl: 2, blk: 3, fgp: "48%" },
  { name: "D. Kim", pts: 10, reb: 3, ast: 7, stl: 4, blk: 0, fgp: "40%" },
  { name: "J. Rivera", pts: 7, reb: 6, ast: 1, stl: 0, blk: 2, fgp: "33%" },
];

/* ─── page ─── */

export default function GhibliPrototypePage() {
  const [activeColorway, setActiveColorway] = useState<string>("twilight");
  const cw = COLORWAYS[activeColorway];

  return (
    <div
      className={`${atkinson.variable} ${atkinsonMono.variable}`}
      style={{
        fontFamily: "var(--font-main), system-ui, sans-serif",
        background: BASE.cream,
        color: BASE.text,
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes gh-breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes gh-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gh-leaf-drift {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 0.5; }
          92% { opacity: 0.5; }
          100% { transform: translate(50px, 100px) rotate(160deg); opacity: 0; }
        }
        @keyframes gh-live-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.6); }
        }
        .gh-card {
          animation: gh-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .gh-card:nth-child(2) { animation-delay: 0.06s; }
        .gh-card:nth-child(3) { animation-delay: 0.12s; }
        .gh-card:nth-child(4) { animation-delay: 0.18s; }
        .gh-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 6px 28px ${BASE.shadowHover},
            0 1px 4px ${BASE.shadow};
        }
        .cw-swatch {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cw-swatch:hover { transform: scale(1.05); }
      `}</style>

      {/* ━━━ COLORWAY PICKER (sticky) ━━━ */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${BASE.cream}ee`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BASE.border}`,
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "920px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-main)",
              fontWeight: 600,
              fontSize: "0.8125rem",
              color: BASE.textSecondary,
            }}
          >
            Colorway:
          </span>
          {Object.entries(COLORWAYS).map(([key, c]) => (
            <button
              key={key}
              className="cw-swatch"
              onClick={() => setActiveColorway(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px 6px 8px",
                borderRadius: "12px",
                border:
                  activeColorway === key
                    ? `2px solid ${c.primary}`
                    : `1.5px solid ${BASE.border}`,
                background:
                  activeColorway === key ? c.primarySoft : BASE.white,
                fontFamily: "var(--font-main)",
                fontWeight: activeColorway === key ? 700 : 500,
                fontSize: "0.8125rem",
                color: activeColorway === key ? c.primaryOnCream : BASE.text,
                boxShadow:
                  activeColorway === key
                    ? `0 0 0 2px ${c.primaryGlow}`
                    : "none",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "6px",
                  background: c.primary,
                }}
              />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ━━━ HERO ━━━ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "72px 24px 96px",
          textAlign: "center",
          background: `
            radial-gradient(ellipse 70% 50% at 50% 100%, ${cw.primarySoft} 0%, transparent 70%),
            linear-gradient(180deg, ${BASE.cream} 0%, ${BASE.creamDeep} 100%)
          `,
          transition: "background 0.5s",
        }}
      >
        {/* Paper texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.025,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />

        {/* Floating leaves */}
        {[
          { left: "10%", delay: "0s", size: "14px", dur: "7s" },
          { left: "75%", delay: "2.5s", size: "11px", dur: "8s" },
          { left: "42%", delay: "5s", size: "12px", dur: "6.5s" },
          { left: "90%", delay: "1s", size: "10px", dur: "9s" },
        ].map((leaf, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "-16px",
              left: leaf.left,
              width: leaf.size,
              height: leaf.size,
              borderRadius: "0 50% 50% 50%",
              background: cw.primary,
              opacity: 0,
              animation: `gh-leaf-drift ${leaf.dur} ease-in-out ${leaf.delay} infinite`,
              pointerEvents: "none",
              transition: "background 0.5s",
            }}
          />
        ))}

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "36px",
              animation: "gh-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: cw.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px",
                color: cw.primaryText,
                transition: "background 0.5s",
              }}
            >
              P
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.05em",
                color: BASE.textSecondary,
              }}
            >
              Playground
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontWeight: 800,
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 auto 20px",
              maxWidth: "640px",
              animation:
                "gh-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
            }}
          >
            Where friends
            <br />
            come to{" "}
            <span
              style={{
                color: cw.primaryOnCream,
                fontStyle: "italic",
                transition: "color 0.5s",
              }}
            >
              play
            </span>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.65,
              color: BASE.textSecondary,
              maxWidth: "440px",
              margin: "0 auto 36px",
              animation:
                "gh-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
            }}
          >
            Organize pickup games, track scores together, and keep every moment
            with the people you love playing with.
          </p>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              animation:
                "gh-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
            }}
          >
            <button
              style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                padding: "13px 28px",
                borderRadius: "14px",
                border: "none",
                background: cw.primary,
                color: cw.primaryText,
                cursor: "pointer",
                transition: "background 0.5s, transform 0.2s, box-shadow 0.2s",
                boxShadow: `0 2px 12px ${cw.primaryGlow}`,
              }}
            >
              Get Started
            </button>
            <button
              style={{
                fontWeight: 600,
                fontSize: "0.9375rem",
                padding: "13px 28px",
                borderRadius: "14px",
                border: `1.5px solid ${BASE.border}`,
                background: BASE.white,
                color: BASE.text,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: `0 1px 6px ${BASE.shadow}`,
              }}
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ COLORWAY INFO ━━━ */}
      <section style={{ maxWidth: "920px", margin: "0 auto", padding: "48px 24px 0" }}>
        <div
          style={{
            background: BASE.white,
            borderRadius: "20px",
            border: `1px solid ${BASE.border}`,
            boxShadow: `0 1px 8px ${BASE.shadow}`,
            padding: "24px 28px",
            display: "flex",
            gap: "24px",
            alignItems: "center",
            flexWrap: "wrap",
            transition: "border-color 0.5s",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: cw.primary,
              transition: "background 0.5s",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "4px", transition: "color 0.5s", color: cw.primaryOnCream }}>
              {cw.name}
            </div>
            <div style={{ fontSize: "0.9375rem", color: BASE.textSecondary, marginBottom: "4px" }}>
              {cw.description}
            </div>
            <div style={{ fontSize: "0.8125rem", color: BASE.textSecondary, fontStyle: "italic" }}>
              {cw.inspiration}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ PALETTE + TYPOGRAPHY ━━━ */}
      <section style={{ maxWidth: "920px", margin: "0 auto", padding: "56px 24px" }}>
        <SectionHeader
          title="Design System"
          subtitle="Atkinson Hyperlegible Next + warm pastel palette"
        />

        {/* Palette swatches */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "36px" }}>
          {[
            { label: "Cream", color: BASE.cream, border: true },
            { label: "White", color: BASE.white, border: true },
            { label: "Primary", color: cw.primary },
            { label: "Primary Soft", color: cw.primarySoft, border: true },
            { label: "Live", color: cw.live },
            { label: "Text", color: BASE.text },
            { label: "Text 2nd", color: BASE.textSecondary },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div
                style={{
                  height: "56px",
                  borderRadius: "14px",
                  background: s.color,
                  border: s.border ? `1px solid ${BASE.border}` : "none",
                  boxShadow: `0 1px 4px ${BASE.shadow}`,
                  transition: "background 0.5s",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: BASE.textSecondary }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Sport accents */}
        <p style={{ fontWeight: 700, fontSize: "0.8125rem", letterSpacing: "0.03em", color: BASE.textSecondary, marginBottom: "12px" }}>
          Sport Accents (same across all colorways)
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "48px" }}>
          {Object.values(SPORTS).map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 12px 7px 7px",
                borderRadius: "12px",
                background: s.accentSoft,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: BASE.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  boxShadow: `0 1px 3px ${BASE.shadow}`,
                }}
              >
                {s.icon}
              </div>
              <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: s.accentText }}>
                {s.label}
              </span>
            </div>
          ))}
          {[
            { icon: "\u{1F3C3}", label: "Running" },
            { icon: "\u{1F3CA}", label: "Swimming" },
            { icon: "\u26BE", label: "Baseball" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 12px 7px 7px",
                borderRadius: "12px",
                opacity: 0.38,
                background: `${BASE.text}08`,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: BASE.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                {s.icon}
              </div>
              <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Typography */}
        <p style={{ fontWeight: 700, fontSize: "0.8125rem", letterSpacing: "0.03em", color: BASE.textSecondary, marginBottom: "16px" }}>
          Type Scale &mdash; Atkinson Hyperlegible Next (all weights) + Mono
        </p>
        <div
          style={{
            background: BASE.white,
            borderRadius: "20px",
            padding: "28px",
            boxShadow: `0 1px 8px ${BASE.shadow}`,
            border: `1px solid ${BASE.border}`,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {[
            { label: "DISPLAY / 800", text: "Where friends come to play", style: { fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.05, letterSpacing: "-0.02em" } },
            { label: "H1 / 700", text: "Activity Feed", style: { fontWeight: 700, fontSize: "1.625rem", lineHeight: 1.15, letterSpacing: "-0.01em" } },
            { label: "H2 / 700", text: "Box Scores", style: { fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 } },
            { label: "BODY / 400", text: "Organize pickup games with friends, track scores in real time, and livestream every moment. Your games deserve better than a group chat.", style: { fontWeight: 400, fontSize: "1rem", lineHeight: 1.65, color: BASE.textSecondary, maxWidth: "520px" } },
            { label: "BODY SEMIBOLD / 600", text: "Squad Alpha vs Night Owls \u00b7 5v5 Basketball", style: { fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.4 } },
            { label: "STAT / MONO 700", text: "72 \u2013 68", style: { fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "2.25rem", lineHeight: 1, letterSpacing: "-0.02em", color: cw.primaryOnCream, transition: "color 0.5s" } },
            { label: "CAPTION / 500", text: "Riverside Park \u00b7 Feb 24, 2026 \u00b7 4 quarters", style: { fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.4, color: BASE.textSecondary } },
            { label: "MONO TABLE / 400", text: "PTS  REB  AST  STL  BLK  FG%", style: { fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: "0.75rem", lineHeight: 1.4, letterSpacing: "0.04em", color: BASE.textSecondary } },
          ].map((item) => (
            <div key={item.label}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: BASE.textSecondary, letterSpacing: "0.06em" }}>
                {item.label}
              </span>
              <div style={{ marginTop: "4px", ...item.style }}>{item.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ GAME FEED ━━━ */}
      <section style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 24px 56px" }}>
        <SectionHeader title="Game Feed" subtitle="Cards shift with the selected colorway" />

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {MOCK_GAMES.map((game, i) => {
            const sport = SPORTS[game.sport];
            const isLive = game.status === "LIVE";
            return (
              <div
                key={i}
                className="gh-card"
                style={{
                  background: BASE.white,
                  borderRadius: "18px",
                  border: `1px solid ${BASE.border}`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s",
                  boxShadow: `0 1px 6px ${BASE.shadow}`,
                }}
              >
                {/* Accent strip */}
                <div
                  style={{
                    height: "3px",
                    background: `linear-gradient(90deg, ${sport.accent}, transparent 80%)`,
                    opacity: 0.6,
                  }}
                />

                <div style={{ padding: "18px 20px" }}>
                  {/* Friends */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ display: "flex" }}>
                      {game.friends.map((initial, j) => (
                        <div
                          key={j}
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: sport.accentSoft,
                            border: `2px solid ${BASE.white}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.625rem",
                            color: sport.accentText,
                            marginLeft: j > 0 ? "-7px" : "0",
                            position: "relative",
                            zIndex: game.friends.length - j,
                          }}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.8125rem", color: BASE.textSecondary }}>
                      {game.friendNames}
                    </span>
                  </div>

                  {/* Sport + Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "16px" }}>{sport.icon}</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.6875rem",
                        padding: "3px 9px",
                        borderRadius: "8px",
                        background: sport.accentSoft,
                        color: sport.accentText,
                      }}
                    >
                      {game.subtype}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.6875rem",
                        padding: "3px 9px",
                        borderRadius: "8px",
                        background: isLive ? cw.liveSoft : BASE.creamDeep,
                        color: isLive ? cw.live : BASE.textSecondary,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "background 0.5s, color 0.5s",
                      }}
                    >
                      {isLive && (
                        <span style={{ position: "relative", display: "inline-block", width: "7px", height: "7px" }}>
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: "50%",
                              background: cw.live,
                              animation: "gh-live-breathe 2s ease-in-out infinite",
                              transition: "background 0.5s",
                            }}
                          />
                          <span style={{ position: "absolute", inset: "1px", borderRadius: "50%", background: cw.live, transition: "background 0.5s" }} />
                        </span>
                      )}
                      {isLive ? "LIVE" : game.status}
                    </span>
                  </div>

                  {/* Scoreboard */}
                  <div
                    style={{
                      background: BASE.cream,
                      borderRadius: "14px",
                      padding: "14px 18px",
                      marginBottom: "14px",
                      border: `1px solid ${BASE.border}`,
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "10px" }}>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.8125rem", marginBottom: "3px" }}>{game.teamA}</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: "1.75rem",
                            lineHeight: 1,
                            color: game.scoreA > game.scoreB ? cw.primaryOnCream : BASE.text,
                            transition: "color 0.5s",
                          }}
                        >
                          {game.scoreA}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.625rem",
                          letterSpacing: "0.06em",
                          color: BASE.textSecondary,
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: BASE.white,
                        }}
                      >
                        {isLive ? "Q3 4:22" : game.status}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.8125rem", marginBottom: "3px" }}>{game.teamB}</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: "1.75rem",
                            lineHeight: 1,
                            color: game.scoreB > game.scoreA ? cw.primaryOnCream : BASE.text,
                            transition: "color 0.5s",
                          }}
                        >
                          {game.scoreB}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "0.78rem", color: BASE.textSecondary, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {game.location}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      {game.date}
                    </span>
                    {game.media > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        {game.media} {game.media === 1 ? "photo" : "photos"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ SCOREBOARD DETAIL ━━━ */}
      <section style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px 56px" }}>
        <SectionHeader title="Game Detail" subtitle="Scoreboard + box scores adapt to the active colorway" />

        {/* Scoreboard */}
        <div
          style={{
            background: BASE.white,
            borderRadius: "22px",
            border: `1px solid ${BASE.border}`,
            boxShadow: `0 2px 12px ${BASE.shadow}`,
            overflow: "hidden",
            marginBottom: "20px",
          }}
        >
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${cw.primary}, transparent 80%)`, opacity: 0.45, transition: "background 0.5s" }} />

          <div style={{ padding: "28px 28px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "0.8125rem", color: BASE.textSecondary, marginBottom: "22px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>{SPORTS.basketball.icon}</span>
              5v5 Basketball &middot; 4 Quarters &middot; Riverside Park
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "20px", maxWidth: "460px", margin: "0 auto" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>Squad Alpha</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "3rem", lineHeight: 1, color: cw.primaryOnCream, transition: "color 0.5s" }}>72</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.06em", color: BASE.textSecondary, padding: "5px 14px", borderRadius: "10px", background: BASE.cream }}>
                FINAL
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>Night Owls</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "3rem", lineHeight: 1 }}>68</div>
              </div>
            </div>

            {/* Quarters */}
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "22px" }}>
              {[
                { q: "Q1", a: 18, b: 20 },
                { q: "Q2", a: 22, b: 15 },
                { q: "Q3", a: 16, b: 19 },
                { q: "Q4", a: 16, b: 14 },
              ].map((q) => (
                <div key={q.q} style={{ padding: "7px 14px", background: BASE.cream, borderRadius: "10px", textAlign: "center", minWidth: "58px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.625rem", color: BASE.textSecondary, marginBottom: "3px" }}>{q.q}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.8125rem" }}>
                    {q.a} &ndash; {q.b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Box Score */}
        <div
          style={{
            background: BASE.white,
            borderRadius: "18px",
            border: `1px solid ${BASE.border}`,
            boxShadow: `0 1px 8px ${BASE.shadow}`,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BASE.border}`, fontWeight: 700, fontSize: "0.875rem" }}>
            Box Score &mdash; Squad Alpha
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BASE.border}` }}>
                  {["Player", "PTS", "REB", "AST", "STL", "BLK", "FG%"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: h === "Player" ? "left" : "right", fontWeight: 600, fontSize: "0.625rem", letterSpacing: "0.04em", color: BASE.textSecondary }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BOX_SCORE_ROWS.map((row, i) => {
                  const maxPts = Math.max(...BOX_SCORE_ROWS.map((r) => r.pts));
                  const maxReb = Math.max(...BOX_SCORE_ROWS.map((r) => r.reb));
                  const maxAst = Math.max(...BOX_SCORE_ROWS.map((r) => r.ast));
                  return (
                    <tr
                      key={row.name}
                      style={{
                        borderBottom: i < BOX_SCORE_ROWS.length - 1 ? `1px solid ${BASE.border}` : "none",
                        background: i % 2 === 1 ? BASE.cream : "transparent",
                      }}
                    >
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-main)", fontWeight: 600, fontSize: "0.8125rem" }}>{row.name}</td>
                      {[
                        { val: row.pts, max: maxPts },
                        { val: row.reb, max: maxReb },
                        { val: row.ast, max: maxAst },
                        { val: row.stl, max: -1 },
                        { val: row.blk, max: -1 },
                      ].map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: cell.val === cell.max && cell.max > 0 ? cw.primaryOnCream : BASE.text,
                            fontWeight: cell.val === cell.max && cell.max > 0 ? 700 : 400,
                            transition: "color 0.5s",
                          }}
                        >
                          {cell.val}
                        </td>
                      ))}
                      <td style={{ padding: "9px 12px", textAlign: "right" }}>{row.fgp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ━━━ NAV ━━━ */}
      <section style={{ maxWidth: "920px", margin: "0 auto", padding: "40px 24px 56px" }}>
        <SectionHeader title="Navigation" subtitle="Adapts to colorway \u2014 buttons, active states, and indicators" />

        {/* Top bar */}
        <div
          style={{
            background: BASE.white,
            borderRadius: "16px",
            border: `1px solid ${BASE.border}`,
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "20px",
            boxShadow: `0 1px 6px ${BASE.shadow}`,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: cw.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "15px",
              color: cw.primaryText,
              transition: "background 0.5s",
              flexShrink: 0,
            }}
          >
            P
          </div>
          <div
            style={{
              flex: 1,
              background: BASE.cream,
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "0.8125rem",
              color: BASE.textSecondary,
              border: `1px solid ${BASE.border}`,
            }}
          >
            Search players, games...
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: BASE.cream, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: BASE.textSecondary }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <div style={{ position: "absolute", top: "5px", right: "5px", width: "7px", height: "7px", borderRadius: "50%", background: cw.live, border: `1.5px solid ${BASE.white}`, transition: "background 0.5s" }} />
            </div>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: cw.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: cw.primaryText, transition: "background 0.5s" }}>
              K
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            background: BASE.white,
            borderRadius: "16px",
            border: `1px solid ${BASE.border}`,
            padding: "10px 0",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            boxShadow: `0 1px 6px ${BASE.shadow}`,
          }}
        >
          {[
            { label: "Feed", icon: "\u{1F3E0}", active: true },
            { label: "Games", icon: "\u{1F3DF}\u{FE0F}", active: false },
            { label: "Chat", icon: "\u{1F4AC}", active: false },
            { label: "Profile", icon: "\u{1F464}", active: false },
          ].map((tab) => (
            <div key={tab.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer" }}>
              <span style={{ fontSize: "16px", opacity: tab.active ? 1 : 0.45 }}>{tab.icon}</span>
              <span
                style={{
                  fontWeight: tab.active ? 700 : 500,
                  fontSize: "0.625rem",
                  color: tab.active ? cw.primaryOnCream : BASE.textSecondary,
                  transition: "color 0.5s",
                }}
              >
                {tab.label}
              </span>
              {tab.active && (
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: cw.primary, transition: "background 0.5s" }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          padding: "48px 24px 36px",
          borderTop: `1px solid ${BASE.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "28px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "8px",
                background: cw.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "13px",
                color: cw.primaryText,
                transition: "background 0.5s",
              }}
            >
              P
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>Playground</span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: BASE.textSecondary, maxWidth: "260px", lineHeight: 1.5 }}>
            Where friends come to play.
          </p>
        </div>
        {[
          { title: "Product", links: ["Features", "Getting Started"] },
          { title: "Company", links: ["About", "Contact"] },
          { title: "Legal", links: ["Privacy Policy", "Terms"] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{ fontWeight: 700, fontSize: "0.8125rem", marginBottom: "10px" }}>{col.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {col.links.map((link) => (
                <span key={link} style={{ fontSize: "0.8125rem", color: BASE.textSecondary, cursor: "pointer" }}>{link}</span>
              ))}
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

/* ─── shared ─── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h2 style={{ fontWeight: 800, fontSize: "1.625rem", lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "6px" }}>
        {title}
      </h2>
      <p style={{ fontSize: "0.9375rem", color: BASE.textSecondary, lineHeight: 1.5 }}>
        {subtitle}
      </p>
    </div>
  );
}
