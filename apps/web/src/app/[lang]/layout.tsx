import { Noto_Sans, Noto_Sans_Display } from 'next/font/google';
import '../globals.css';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';

import type { Metadata } from 'next';

import { routing } from '@/i18n/routing';

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin'],
});

const notoSansDisplay = Noto_Sans_Display({
  variable: '--font-noto-sans-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Planici',
  description: 'The planner made for you.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang: locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSansDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className='flex min-h-full flex-col'>
        <ThemeProvider
          attribute='data-theme'
          defaultTheme='system'
          enableSystem
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
