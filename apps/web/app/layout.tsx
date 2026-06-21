import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CloudShell } from '@/components/cloud-shell';
import { AuthProvider } from '@/lib/auth-context';
import { serverAuthMe } from '@/lib/server-api';
import './globals.css';

export const metadata: Metadata = {
  description: 'Goyo Cloud account access for sync, account status, and future billing.',
  robots: 'noindex, nofollow',
  title: 'Goyo Cloud',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await serverAuthMe();
  const initialUser = auth.ok ? (auth.value?.user ?? null) : null;

  return (
    <html lang="en">
      <body>
        <AuthProvider initialUser={initialUser}>
          <CloudShell>{children}</CloudShell>
        </AuthProvider>
      </body>
    </html>
  );
}
