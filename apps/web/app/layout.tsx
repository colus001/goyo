import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CloudShell } from '@/components/cloud-shell';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  description: 'Goyo Cloud account access for sync, account status, and future billing.',
  robots: 'noindex, nofollow',
  title: 'Goyo Cloud',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CloudShell>{children}</CloudShell>
        </AuthProvider>
      </body>
    </html>
  );
}
