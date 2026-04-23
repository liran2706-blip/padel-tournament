import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mixing Padel',
  description: 'מערכת ניהול טורניר מיקסינג פאדל',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="bg-blue-50 text-slate-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
