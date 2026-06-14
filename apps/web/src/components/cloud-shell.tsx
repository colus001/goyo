'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        isActive
          ? 'bg-[#f3f0df]/12 text-[#f3f0df]'
          : 'text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]'
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

export function CloudShell({ children }: { children: ReactNode }) {
  const { isLoading, logout, user } = useAuth();

  const showNavLinks = !isLoading;

  return (
    <main className="min-h-screen overflow-hidden bg-[#151816] px-5 py-6 text-[#eef0e8] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(217,190,127,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(126,153,125,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="mb-16 flex items-center justify-between rounded-full border border-[#f3f0df]/10 bg-[#1d221d]/75 px-4 py-3 backdrop-blur">
          <Link
            className="font-semibold text-sm tracking-[0.22em] uppercase"
            href={user ? '/account' : '/login'}
          >
            Goyo Cloud
          </Link>
          {showNavLinks ? (
            <div className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  <NavLink href="/documents" label="Documents" />
                  <NavLink href="/account" label="Account" />
                  <NavLink href="/billing" label="Billing" />
                  <span className="mx-1 text-[#f3f0df]/20">|</span>
                  <span className="text-[#9fa99b] text-xs">{user.email}</span>
                  <button
                    className="rounded-full border border-[#f3f0df]/20 px-3 py-1 text-[#b8b9ac] text-xs transition hover:bg-[#d86b53]/20 hover:border-[#d86b53]/40 hover:text-[#d86b53]"
                    onClick={logout}
                    type="button"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink href="/login" label="Sign in" />
              )}
            </div>
          ) : null}
        </nav>
        {children}
      </div>
    </main>
  );
}
