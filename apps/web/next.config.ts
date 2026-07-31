import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["18.224.113.185", "177.200.208.82"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
