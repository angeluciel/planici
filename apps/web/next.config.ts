import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const ip = process.env.IP_ADDRESS;

const nextConfig: NextConfig = {
	allowedDevOrigins: [ip],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
