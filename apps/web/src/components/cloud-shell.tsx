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
      className={`rounded-full px-3 py-1.5 text-[0.85rem] transition ${
        isActive
          ? 'bg-[var(--goyo-active-row)] text-[var(--goyo-text)]'
          : 'text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-raised)] hover:text-[var(--goyo-text)]'
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
    <main className="goyo-cloud-shell min-h-screen overflow-hidden text-[var(--goyo-text)] [font-family:var(--goyo-ui-font-family)]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <span className="goyo-prose absolute -top-36 right-[-6rem] select-none font-semibold text-[34rem] leading-none tracking-[-0.06em] text-[var(--goyo-text-muted)] opacity-[0.08] sm:text-[44rem]">
          G
        </span>
      </div>
      <header className="sticky top-0 z-30 border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--goyo-paper)]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <Link
            aria-label="Goyo Cloud home"
            className="group flex items-center gap-3"
            href={user ? '/account' : '/login'}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-[var(--goyo-accent)] font-semibold text-[0.9rem] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_-18px_rgba(31,29,25,0.8)] transition group-hover:scale-[1.03]"
            >
              G
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-semibold text-[1.28rem] leading-none tracking-[-0.055em] text-[var(--goyo-text)]">
                Goyo
              </span>
              <span className="hidden font-medium text-[0.68rem] uppercase tracking-[0.18em] text-[var(--goyo-text-faint)] sm:inline">
                Cloud
              </span>
            </span>
          </Link>
          {showNavLinks ? (
            <div className="flex min-w-0 items-center gap-1.5">
              {user ? (
                <>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <NavLink href="/books" label="Books" />
                    <NavLink href="/account" label="Account" />
                    <NavLink href="/billing" label="Billing" />
                  </div>
                  <span className="mx-2 hidden h-4 w-px bg-[var(--goyo-border)] lg:inline-block" />
                  <span className="hidden max-w-[13rem] truncate text-[var(--goyo-text-muted)] text-xs lg:inline">
                    {user.email}
                  </span>
                  <button
                    className="rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-paper)] px-3 py-1.5 text-[var(--goyo-text-muted)] text-xs transition hover:bg-[var(--goyo-raised)] hover:text-[var(--goyo-danger)]"
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
        </div>
        {user && showNavLinks ? (
          <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-5 pb-3 sm:hidden">
            <NavLink href="/books" label="Books" />
            <NavLink href="/account" label="Account" />
            <NavLink href="/billing" label="Billing" />
          </div>
        ) : null}
      </header>
      <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-8 sm:pt-16 lg:px-12">
        {children}
      </div>
    </main>
  );
}
