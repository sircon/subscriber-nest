import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3099';

export const metadata: Metadata = {
  title: {
    default: 'Audience Safe',
    template: '%s | Audience Safe',
  },
  description: 'Keep your audience safe and backed up.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Audience Safe',
    description: 'Keep your audience safe and backed up.',
    type: 'website',
    siteName: 'Audience Safe',
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
        alt: 'Audience Safe',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audience Safe',
    description: 'Keep your audience safe and backed up.',
    images: ['/og'],
  },
  appleWebApp: {
    title: 'Audience Safe',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
