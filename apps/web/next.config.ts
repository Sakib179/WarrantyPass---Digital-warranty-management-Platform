import { resolve } from 'node:path';

import { config as loadEnvironmentFile } from 'dotenv';
import type { NextConfig } from 'next';

loadEnvironmentFile({
  path: resolve(import.meta.dirname, '../../.env'),
  quiet: true,
});

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@warrantypass/ui', '@warrantypass/shared', '@warrantypass/validation'],
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
