import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const ip = process.env.IP_ADDRESS;

const nextConfig: NextConfig = {
	output: "standalone",
	outputFileTracingRoot: path.join(__dirname, "../../"),
	allowedDevOrigins: ip ? [ip] : [],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
