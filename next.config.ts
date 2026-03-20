import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    testProxy: !!process.env.PLAYWRIGHT,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
