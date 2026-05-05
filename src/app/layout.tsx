import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Crypto Tycoon Pro — Trading Simulator',
  description: 'Advanced cryptocurrency trading simulator. Practice strategies, manage risk, and track your performance in real time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-crypto-bg text-crypto-text min-h-screen`}
        style={{ background: "linear-gradient(180deg,#0a0a0f 0%,#0f0f1a 100%)" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
