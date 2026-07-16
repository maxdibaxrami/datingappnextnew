import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { Root } from '@/components/Root/Root';
import { I18nProvider } from '@/core/i18n/provider';

import '@telegram-apps/telegram-ui/dist/styles.css';
import 'normalize.css/normalize.css';
import './_assets/globals.css';

export const metadata: Metadata = {
  title: 'Paw Date',
  description: 'Telegram dating mini app',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <Root>{children}</Root>
        </I18nProvider>
      </body>
    </html>
  );
}
