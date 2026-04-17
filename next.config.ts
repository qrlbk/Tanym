import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

// Next may pick a parent folder when multiple lockfiles exist (e.g. ~/package-lock.json),
// which breaks dev resolution and can make localhost show a compile error / hang.
const projectDir = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Next.js 16+ blocks cross-origin-style requests to `/_next/*` in dev unless the
 * request's Origin host matches localhost or this list. Opening the app via a LAN
 * IP (e.g. http://192.168.49.65:3000) sends Origin with that IP — without these
 * patterns, script chunks return 403 and the UI never hydrates (buttons dead).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const allowedDevOriginsFromEnv = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultPrivateLanDevOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  "172.16.*.*",
  "172.17.*.*",
  "172.18.*.*",
  "172.19.*.*",
  "172.20.*.*",
  "172.21.*.*",
  "172.22.*.*",
  "172.23.*.*",
  "172.24.*.*",
  "172.25.*.*",
  "172.26.*.*",
  "172.27.*.*",
  "172.28.*.*",
  "172.29.*.*",
  "172.30.*.*",
  "172.31.*.*",
];

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins:
    allowedDevOriginsFromEnv?.length ? allowedDevOriginsFromEnv : defaultPrivateLanDevOrigins,
  turbopack: {
    root: projectDir,
  },
};

export default withBundleAnalyzer(nextConfig);
