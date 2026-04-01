export default function RootNotFound() {
  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <head>
        <style>{`
          a:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #302b22 !important; color: #e5e5e5 !important; }
            a { color: #e5e5e5 !important; border-color: #666 !important; }
            a:focus-visible { outline-color: #e5e5e5; }
          }
        `}</style>
      </head>
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          margin: 0,
          backgroundColor: "#faf3e6",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          404
        </h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Page not found
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Root not-found has no access to next-intl Link */}
        <a
          href="/"
          style={{
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
            textDecoration: "none",
            color: "#1a1a1a",
          }}
        >
          Return Home
        </a>
      </body>
    </html>
  );
}
