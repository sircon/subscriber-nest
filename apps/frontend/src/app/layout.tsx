import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SubscriberNest',
  description: 'Sync and export your subscriber list from your ESP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
