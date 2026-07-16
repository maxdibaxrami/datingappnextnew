import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/core/i18n/i18n.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '172.20.10.8'],
};

export default withNextIntl(nextConfig);
