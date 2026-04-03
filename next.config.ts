import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { TRUSTED_EMBED_DOMAINS } from "./src/lib/embed-config";

const frameSrc = [
  "'self'",
  ...TRUSTED_EMBED_DOMAINS.map((d) => `https://${d}`),
].join(" ");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    testProxy: !!process.env.PLAYWRIGHT,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src ${frameSrc}`,
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
