import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reel to Canva Agent',
  description: 'Download Instagram Reels, place into design, export',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
