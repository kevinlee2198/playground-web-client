"use client";

import {
  DM_Sans,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

/* ─── mock data ─── */

const SPORTS = {
  basketball: {
    label: "Basketball",
    icon: "\u{1F3C0}",
    accent: "oklch(0.72 0.18 45)",
    accentMuted: "oklch(0.72 0.18 45 / 12%)",
    accentGlow: "oklch(0.72 0.18 45 / 25%)",
  },
  football: {
    label: "Football",
    icon: "\u{1F3C8}",
    accent: "oklch(0.60 0.16 145)",
    accentMuted: "oklch(0.60 0.16 145 / 12%)",
    accentGlow: "oklch(0.60 0.16 145 / 25%)",
  },
  tennis: {
    label: "Tennis",
    icon: "\u{1F3BE}",
    accent: "oklch(0.80 0.16 105)",
    accentMuted: "oklch(0.80 0.16 105 / 12%)",
    accentGlow: "oklch(0.80 0.16 105 / 25%)",
  },
} as const;

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

export default function PrototypePage() {
  return (
    <div
      className={`${dmSans.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{
        /* ─ core tokens ─ */
        ["--pg-surface" as string]: "oklch(0.13 0.01 260)",
        ["--pg-surface-elevated" as string]: "oklch(0.18 0.012 260)",
        ["--pg-surface-overlay" as string]: "oklch(0.22 0.012 260)",
        ["--pg-brand" as string]: "oklch(0.82 0.17 75)",
        ["--pg-brand-muted" as string]: "oklch(0.82 0.17 75 / 15%)",
        ["--pg-brand-glow" as string]: "oklch(0.82 0.17 75 / 25%)",
        ["--pg-live" as string]: "oklch(0.65 0.25 25)",
        ["--pg-win" as string]: "oklch(0.72 0.19 155)",
        ["--pg-text" as string]: "oklch(0.96 0 0)",
        ["--pg-text-secondary" as string]: "oklch(0.62 0 0)",
        ["--pg-border" as string]: "oklch(1 0 0 / 8%)",
        fontFamily: "var(--font-body), system-ui, sans-serif",
        background: "var(--pg-surface)",
        color: "var(--pg-text)",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes pg-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.8); }
        }
        @keyframes pg-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pg-score-glow {
          0%, 100% { text-shadow: 0 0 20px oklch(0.82 0.17 75 / 0%); }
          50% { text-shadow: 0 0 30px oklch(0.82 0.17 75 / 40%); }
        }
        @keyframes pg-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pg-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pg-card {
          animation: pg-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .pg-card:nth-child(2) { animation-delay: 0.08s; }
        .pg-card:nth-child(3) { animation-delay: 0.16s; }
        .pg-card:nth-child(4) { animation-delay: 0.24s; }
        .pg-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px oklch(0 0 0 / 40%);
        }
        .pg-stat-highlight {
          color: var(--pg-brand);
          font-weight: 700;
        }
      `}</style>

      {/* ━━━ HERO ━━━ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "80px 24px 100px",
          textAlign: "center",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.82 0.17 75 / 8%) 0%, transparent 70%),
            var(--pg-surface)
          `,
        }}
      >
        {/* Noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        {/* Court lines decorative element */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            border: "1px solid oklch(1 0 0 / 4%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            border: "1px solid oklch(1 0 0 / 3%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo mark */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "32px",
              animation: "pg-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--pg-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "20px",
                color: "oklch(0.15 0 0)",
              }}
            >
              P
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--pg-text-secondary)",
              }}
            >
              Playground
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              margin: "0 auto 24px",
              maxWidth: "700px",
              animation:
                "pg-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
            }}
          >
            Your games.
            <br />
            <span style={{ color: "var(--pg-brand)" }}>Your crew.</span>
            <br />
            Your stats.
          </h1>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.125rem",
              lineHeight: 1.6,
              color: "var(--pg-text-secondary)",
              maxWidth: "480px",
              margin: "0 auto 40px",
              animation:
                "pg-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
            }}
          >
            Organize pickup games, track live scores, and never miss a moment
            with your friends.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              animation:
                "pg-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both",
            }}
          >
            <button
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.9375rem",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "none",
                background: "var(--pg-brand)",
                color: "oklch(0.15 0.02 75)",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              Get Started
            </button>
            <button
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "0.9375rem",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "1px solid var(--pg-border)",
                background: "var(--pg-surface-elevated)",
                color: "var(--pg-text)",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ COLOR PALETTE ━━━ */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
        <SectionHeader title="Color Palette" subtitle="Dark-mode-first with sport-specific accents" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { label: "Surface", color: "var(--pg-surface)" },
            { label: "Elevated", color: "var(--pg-surface-elevated)" },
            { label: "Overlay", color: "var(--pg-surface-overlay)" },
            { label: "Brand", color: "var(--pg-brand)" },
            { label: "Live", color: "var(--pg-live)" },
            { label: "Win", color: "var(--pg-win)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  height: "72px",
                  borderRadius: "12px",
                  background: s.color,
                  border: "1px solid var(--pg-border)",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--pg-text-secondary)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Sport accents */}
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.8125rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--pg-text-secondary)", marginBottom: "16px" }}>
          Sport Accents
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {Object.values(SPORTS).map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: s.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.875rem" }}>{s.label}</div>
              </div>
            </div>
          ))}
          {[
            { icon: "\u{1F3C3}", label: "Running", color: "oklch(0.70 0.20 25)" },
            { icon: "\u{1F3CA}", label: "Swimming", color: "oklch(0.70 0.14 230)" },
            { icon: "\u26BE", label: "Baseball", color: "oklch(0.65 0.12 55)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.4 }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.875rem" }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)" }}>Coming soon</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ TYPOGRAPHY ━━━ */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
        <SectionHeader title="Typography" subtitle="DM Sans display + IBM Plex Sans body + IBM Plex Mono stats" />

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>DISPLAY / HERO</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 0.95, letterSpacing: "-0.03em", marginTop: "8px" }}>
              Game night starts here
            </h2>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>H1 / PAGE TITLE</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2rem", lineHeight: 1.05, letterSpacing: "-0.02em", marginTop: "8px" }}>
              Activity Feed
            </h2>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>H2 / SECTION</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.15, letterSpacing: "-0.01em", marginTop: "8px" }}>
              Box Scores
            </h3>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>BODY</span>
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: "1rem", lineHeight: 1.6, marginTop: "8px", color: "var(--pg-text-secondary)", maxWidth: "600px" }}>
              Organize pickup games with friends, track scores in real time, record stats, upload highlights, and livestream every moment. Your games deserve better than a group chat.
            </p>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>STAT / SCORE</span>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "2.5rem", lineHeight: 1, letterSpacing: "-0.02em", marginTop: "8px", color: "var(--pg-brand)" }}>
              72 &ndash; 68
            </div>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--pg-text-secondary)", letterSpacing: "0.04em" }}>CAPTION / META</span>
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.4, letterSpacing: "0.01em", marginTop: "8px", color: "var(--pg-text-secondary)" }}>
              Riverside Park &middot; Feb 24, 2026 &middot; 5v5 &middot; 4 quarters
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ GAME FEED CARDS ━━━ */}
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px" }}>
        <SectionHeader title="Game Feed" subtitle="Sport-contextual cards with live indicators" />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {MOCK_GAMES.map((game, i) => {
            const sport = SPORTS[game.sport];
            const isLive = game.status === "LIVE";
            return (
              <div
                key={i}
                className="pg-card"
                style={{
                  background: "var(--pg-surface-elevated)",
                  borderRadius: "16px",
                  border: "1px solid var(--pg-border)",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s",
                  position: "relative",
                }}
              >
                {/* Sport accent gradient strip */}
                <div
                  style={{
                    height: "3px",
                    background: `linear-gradient(90deg, ${sport.accent}, transparent)`,
                  }}
                />

                <div style={{ padding: "20px" }}>
                  {/* Friend context */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ display: "flex" }}>
                      {game.friends.map((initial, j) => (
                        <div
                          key={j}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: sport.accentMuted,
                            border: "2px solid var(--pg-surface-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "0.6875rem",
                            color: sport.accent,
                            marginLeft: j > 0 ? "-8px" : "0",
                            position: "relative",
                            zIndex: game.friends.length - j,
                          }}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        color: "var(--pg-text-secondary)",
                      }}
                    >
                      {game.friendNames}
                    </span>
                  </div>

                  {/* Sport + Status row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{sport.icon}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        background: sport.accentMuted,
                        color: sport.accent,
                      }}
                    >
                      {game.subtype}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        background: isLive
                          ? "oklch(0.65 0.25 25 / 15%)"
                          : "oklch(1 0 0 / 6%)",
                        color: isLive
                          ? "var(--pg-live)"
                          : "var(--pg-text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isLive && (
                        <span
                          style={{
                            position: "relative",
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: "50%",
                              background: "var(--pg-live)",
                              animation: "pg-pulse 1.5s ease-in-out infinite",
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              inset: "1px",
                              borderRadius: "50%",
                              background: "var(--pg-live)",
                            }}
                          />
                        </span>
                      )}
                      {isLive ? "LIVE" : game.status}
                    </span>
                  </div>

                  {/* Scoreboard */}
                  <div
                    style={{
                      background: "oklch(0 0 0 / 20%)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {/* Team A */}
                      <div style={{ textAlign: "left" }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            marginBottom: "4px",
                          }}
                        >
                          {game.teamA}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: "2rem",
                            lineHeight: 1,
                            color:
                              game.scoreA > game.scoreB
                                ? sport.accent
                                : "var(--pg-text)",
                            ...(isLive
                              ? {
                                  animation:
                                    "pg-score-glow 2s ease-in-out infinite",
                                }
                              : {}),
                          }}
                        >
                          {game.scoreA}
                        </div>
                      </div>

                      {/* Divider */}
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "0.6875rem",
                          letterSpacing: "0.08em",
                          color: "var(--pg-text-secondary)",
                          textAlign: "center",
                        }}
                      >
                        {isLive ? "Q3 4:22" : game.status}
                      </div>

                      {/* Team B */}
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            marginBottom: "4px",
                          }}
                        >
                          {game.teamB}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: "2rem",
                            lineHeight: 1,
                            color:
                              game.scoreB > game.scoreA
                                ? sport.accent
                                : "var(--pg-text)",
                            ...(isLive
                              ? {
                                  animation:
                                    "pg-score-glow 2s ease-in-out infinite 0.5s",
                                }
                              : {}),
                          }}
                        >
                          {game.scoreB}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      color: "var(--pg-text-secondary)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {game.location}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      {game.date}
                    </span>
                    {game.media > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
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
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 24px" }}>
        <SectionHeader title="Game Detail" subtitle="Broadcast-style scoreboard with box scores" />

        {/* Scoreboard header */}
        <div
          style={{
            background: "var(--pg-surface-elevated)",
            borderRadius: "20px",
            border: "1px solid var(--pg-border)",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          {/* Sport accent gradient */}
          <div
            style={{
              height: "4px",
              background: `linear-gradient(90deg, ${SPORTS.basketball.accent}, transparent 80%)`,
            }}
          />

          <div style={{ padding: "32px", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                color: "var(--pg-text-secondary)",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "18px" }}>{SPORTS.basketball.icon}</span>
              5v5 Basketball &middot; 4 Quarters &middot; Riverside Park
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "24px",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    marginBottom: "8px",
                  }}
                >
                  Squad Alpha
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "3.5rem",
                    lineHeight: 1,
                    color: SPORTS.basketball.accent,
                  }}
                >
                  72
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    letterSpacing: "0.1em",
                    color: "var(--pg-text-secondary)",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    background: "oklch(1 0 0 / 6%)",
                  }}
                >
                  FINAL
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    marginBottom: "8px",
                  }}
                >
                  Night Owls
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: "3.5rem",
                    lineHeight: 1,
                  }}
                >
                  68
                </div>
              </div>
            </div>

            {/* Quarter scores */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "2px",
                marginTop: "24px",
              }}
            >
              {[
                { q: "Q1", a: 18, b: 20 },
                { q: "Q2", a: 22, b: 15 },
                { q: "Q3", a: 16, b: 19 },
                { q: "Q4", a: 16, b: 14 },
              ].map((q) => (
                <div
                  key={q.q}
                  style={{
                    padding: "8px 16px",
                    background: "oklch(0 0 0 / 20%)",
                    borderRadius: "8px",
                    textAlign: "center",
                    minWidth: "64px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      color: "var(--pg-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    {q.q}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {q.a} &ndash; {q.b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Box Scores */}
        <div
          style={{
            background: "var(--pg-surface-elevated)",
            borderRadius: "16px",
            border: "1px solid var(--pg-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--pg-border)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.9375rem",
            }}
          >
            Box Score &mdash; Squad Alpha
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--pg-border)",
                  }}
                >
                  {["Player", "PTS", "REB", "AST", "STL", "BLK", "FG%"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: h === "Player" ? "left" : "right",
                          fontWeight: 600,
                          fontSize: "0.6875rem",
                          letterSpacing: "0.04em",
                          color: "var(--pg-text-secondary)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
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
                        borderBottom:
                          i < BOX_SCORE_ROWS.length - 1
                            ? "1px solid var(--pg-border)"
                            : "none",
                        background:
                          i % 2 === 1 ? "oklch(0 0 0 / 8%)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                        }}
                      >
                        {row.name}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color:
                            row.pts === maxPts
                              ? SPORTS.basketball.accent
                              : "inherit",
                          fontWeight: row.pts === maxPts ? 700 : 400,
                        }}
                      >
                        {row.pts}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color:
                            row.reb === maxReb
                              ? SPORTS.basketball.accent
                              : "inherit",
                          fontWeight: row.reb === maxReb ? 700 : 400,
                        }}
                      >
                        {row.reb}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color:
                            row.ast === maxAst
                              ? SPORTS.basketball.accent
                              : "inherit",
                          fontWeight: row.ast === maxAst ? 700 : 400,
                        }}
                      >
                        {row.ast}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {row.stl}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {row.blk}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {row.fgp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ━━━ NAVIGATION CONCEPTS ━━━ */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
        <SectionHeader title="Navigation" subtitle="Slim top bar + side rail (desktop) / bottom tabs (mobile)" />

        {/* Top bar mock */}
        <div
          style={{
            background: "var(--pg-surface-elevated)",
            borderRadius: "14px",
            border: "1px solid var(--pg-border)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--pg-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "16px",
              color: "oklch(0.15 0 0)",
              flexShrink: 0,
            }}
          >
            P
          </div>
          <div
            style={{
              flex: 1,
              background: "oklch(1 0 0 / 6%)",
              borderRadius: "10px",
              padding: "8px 14px",
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--pg-text-secondary)",
            }}
          >
            Search players, games...
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "oklch(1 0 0 / 6%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div style={{
                position: "absolute", top: "6px", right: "6px",
                width: "8px", height: "8px", borderRadius: "50%",
                background: "var(--pg-live)", border: "2px solid var(--pg-surface-elevated)",
              }} />
            </div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${SPORTS.basketball.accent}, ${SPORTS.basketball.accentGlow})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.8125rem",
                color: "oklch(0.15 0 0)",
              }}
            >
              K
            </div>
          </div>
        </div>

        {/* Side rail + Bottom bar mocks */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "24px" }}>
          {/* Side rail */}
          <div
            style={{
              background: "var(--pg-surface-elevated)",
              borderRadius: "14px",
              border: "1px solid var(--pg-border)",
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              width: "64px",
            }}
          >
            {[
              { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Feed", active: true },
              { icon: "M4 6h16M4 10h16M4 14h16M4 18h16", label: "Games", active: false },
              { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "Chat", active: false },
              { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Profile", active: false },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: item.active ? "var(--pg-brand-muted)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.active ? "var(--pg-brand)" : "var(--pg-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
            ))}

            <div style={{ flex: 1 }} />

            {/* New Game FAB */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--pg-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.15 0 0)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>

          {/* Bottom tab bar mock */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                color: "var(--pg-text-secondary)",
                marginBottom: "12px",
              }}
            >
              Mobile bottom navigation:
            </p>
            <div
              style={{
                background: "var(--pg-surface-elevated)",
                borderRadius: "14px",
                border: "1px solid var(--pg-border)",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              {[
                { label: "Feed", active: true },
                { label: "Games", active: false },
                { label: "Chat", active: false },
                { label: "Profile", active: false },
              ].map((tab) => (
                <div
                  key={tab.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: tab.active ? "var(--pg-brand)" : "transparent",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: tab.active ? 700 : 500,
                      fontSize: "0.6875rem",
                      color: tab.active
                        ? "var(--pg-brand)"
                        : "var(--pg-text-secondary)",
                    }}
                  >
                    {tab.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "64px 24px 40px",
          borderTop: "1px solid var(--pg-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "32px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "var(--pg-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "14px",
                color: "oklch(0.15 0 0)",
              }}
            >
              P
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.875rem" }}>
              Playground
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "var(--pg-text-secondary)", maxWidth: "280px" }}>
            Your games. Your crew. Your stats.
          </p>
        </div>
        {[
          { title: "Product", links: ["Features", "Getting Started"] },
          { title: "Company", links: ["About", "Contact"] },
          { title: "Legal", links: ["Privacy Policy", "Terms"] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.8125rem", marginBottom: "12px" }}>
              {col.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {col.links.map((link) => (
                <span
                  key={link}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: "var(--pg-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {link}
                </span>
              ))}
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

/* ─── shared components ─── */

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "1.75rem",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: "8px",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.9375rem",
          color: "var(--pg-text-secondary)",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
