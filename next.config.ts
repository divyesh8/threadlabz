import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Auth action arguments contain passwords; callback URLs contain one-time
  // tokens. Never forward them into Next's development request/action logs.
  logging: {
    serverFunctions: false,
    incomingRequests: { ignore: [/^\/auth(?:\/|\?)/, /^\/account(?:\/|\?|$)/] },
    browserToTerminal: false,
  },
};

export default nextConfig;
