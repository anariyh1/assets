import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	webpack(config) {
		config.resolve = config.resolve ?? {};
		config.resolve.alias = config.resolve.alias ?? {};
		config.resolve.alias["@vercel/analytics/next"] = "@vercel/analytics/react";
		return config;
	},
	turbopack: {
		root: process.cwd(),
		resolveAlias: {
			"@vercel/analytics/next": "@vercel/analytics/react",
		},
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "pub-de50afb5e9934f62ad9c809976d139d8.r2.dev",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
