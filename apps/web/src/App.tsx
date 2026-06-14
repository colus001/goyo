// biome-ignore lint/nursery/noExcessiveLinesPerFile: SPA pages are co-located in App.tsx until split by route
import { yjsUpdatesToExportContent } from '@writer/editor';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import {
  authLogout,
  authMe,
  authStart,
  authVerify,
  base64ToUint8Array,
  type CloudDocument,
  fetchDocumentContent,
  fetchDocuments,
} from './goyo-cloud-api';

interface CloudUser {
  email: string;
  id: string;
}

type Page = 'account' | 'billing' | 'documents' | 'login' | 'verify';

interface AuthState {
  clientId: string | null;
  documentContent: string | null;
  documents: CloudDocument[];
  email: string;
  isDesktopFlow: boolean;
  loadedDocuments: boolean;
  page: Page;
  selectedDocumentId: string | null;
  status: string | null;
  user: CloudUser | null;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: auth flow for desktop deep link and web session
export default function App(): ReactElement {
  const [state, setState] = useState<AuthState>(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');
    const isDesktopFlow = params.get('source') === 'desktop';
    return {
      clientId,
      documentContent: null,
      documents: [],
      email: '',
      isDesktopFlow,
      loadedDocuments: false,
      page: isDesktopFlow ? 'login' : getInitialPage(),
      selectedDocumentId: null,
      status: null,
      user: null,
    };
  });

  useEffect(() => {
    if (state.user) return;
    void authMe().then((result) => {
      if (result.ok && result.user) {
        setState((prev) => {
          if (prev.page === 'login' || prev.page === 'verify') {
            return { ...prev, page: 'account', user: result.user ?? null };
          }
          return { ...prev, user: result.user ?? null };
        });
      }
    });
  }, [state.user]);

  useEffect(() => {
    if (state.page === 'documents' && state.user && !state.loadedDocuments) {
      void fetchDocuments().then((result) => {
        if (result.ok && result.documents) {
          setState((prev) => ({
            ...prev,
            documents: result.documents ?? [],
            loadedDocuments: true,
          }));
        }
      });
    }
  }, [state.page, state.user, state.loadedDocuments]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const documentId = params.get('id');

    if (state.page === 'documents' && documentId && documentId !== state.selectedDocumentId) {
      setState((prev) => ({
        ...prev,
        documentContent: null,
        selectedDocumentId: documentId,
      }));

      void fetchDocumentContent(documentId).then((result) => {
        if (result.ok && result.snapshotBase64) {
          try {
            const snapshot = base64ToUint8Array(result.snapshotBase64);
            const { html } = yjsUpdatesToExportContent({
              documentId,
              snapshot,
              updates: [],
            });
            setState((prev) => {
              if (prev.selectedDocumentId !== documentId) return prev;
              return { ...prev, documentContent: html };
            });
          } catch {
            setState((prev) => {
              if (prev.selectedDocumentId !== documentId) return prev;
              return { ...prev, documentContent: '<p>Could not decode document content.</p>' };
            });
          }
        }
      });
    }
  }, [state.page, state.selectedDocumentId]);

  const onRouteChange = (page: Page) =>
    setState((prev) => ({
      ...prev,
      documentContent: null,
      loadedDocuments: false,
      page,
      selectedDocumentId: null,
      status: null,
    }));
  const onStart = (email: string) => {
    setState((prev) => ({ ...prev, status: 'Sending code…' }));
    void authStart(email).then((result) => {
      if (result.ok) {
        setState((prev) => ({ ...prev, email, page: 'verify', status: null }));
        return;
      }
      setState((prev) => ({ ...prev, status: result.error ?? null }));
    });
  };
  const onVerify = (code: string) => {
    setState((prev) => ({ ...prev, status: 'Verifying…' }));
    void authVerify({
      clientId: state.clientId ?? undefined,
      code,
      email: state.email,
      sessionKind: state.isDesktopFlow ? 'desktop' : 'web',
    }).then((result) => {
      if (result.ok) {
        if (state.isDesktopFlow && result.token && result.user) {
          const params = new URLSearchParams();
          params.set('token', result.token);
          params.set('userId', result.user.id);
          params.set('email', result.user.email);
          window.location.href = `goyo://auth/callback?${params.toString()}`;
          return;
        }
        if (result.user) {
          setState((prev) => ({
            ...prev,
            page: 'account',
            status: null,
            user: result.user ?? null,
          }));
          return;
        }
      }
      setState((prev) => ({ ...prev, status: result.error ?? null }));
    });
  };
  const onLogout = () => {
    void authLogout().then(() =>
      setState((prev) => ({ ...prev, email: '', page: 'login', user: null })),
    );
  };

  const onSelectDocument = (id: string) => {
    window.history.pushState(null, '', `/documents?id=${encodeURIComponent(id)}`);
    setState((prev) => ({ ...prev, selectedDocumentId: id }));
  };

  return renderPage(state, onRouteChange, onStart, onVerify, onLogout, onSelectDocument);
}

interface DocumentRenderProps {
  documentContent: string | null;
  documents: CloudDocument[];
  selectedDocumentId: string | null;
}

function renderPage(
  state: AuthState,
  onRouteChange: (page: Page) => void,
  onStart: (email: string) => void,
  onVerify: (code: string) => void,
  onLogout: () => void,
  onSelectDocument: (id: string) => void,
): ReactElement {
  const docProps: DocumentRenderProps = {
    documentContent: state.documentContent,
    documents: state.documents,
    selectedDocumentId: state.selectedDocumentId,
  };

  if (state.page === 'account') {
    return <AccountPage onLogout={onLogout} onRouteChange={onRouteChange} user={state.user} />;
  }
  if (state.page === 'billing') {
    return <BillingPage onRouteChange={onRouteChange} user={state.user} />;
  }
  if (state.page === 'documents') {
    return (
      <DocumentsPage
        docProps={docProps}
        onRouteChange={onRouteChange}
        onSelectDocument={onSelectDocument}
        user={state.user}
      />
    );
  }
  if (state.page === 'verify') {
    return (
      <VerifyPage
        email={state.email}
        onRouteChange={onRouteChange}
        onVerify={onVerify}
        status={state.status}
        user={state.user}
      />
    );
  }
  return <LoginPage onRouteChange={onRouteChange} onStart={onStart} status={state.status} />;
}

function statusMessage(status: string | null): ReactElement {
  if (!status) return <></>;
  return <p className="mt-4 text-[#c98b7a] text-sm">{status}</p>;
}

function LoginPage({
  onRouteChange,
  onStart,
  status,
}: {
  onRouteChange: (page: Page) => void;
  onStart: (email: string) => void;
  status: string | null;
}): ReactElement {
  const [email, setEmail] = useState('');

  return (
    <CloudShell
      eyebrow="Sign in or create an account"
      onRouteChange={onRouteChange}
      title="One email. One code. No password."
    >
      <Panel>
        <p className="text-[#aab5a5] uppercase tracking-[0.22em] text-sm">Open signup</p>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.04em] text-[#f3f0df]">
          Enter your email. If you are new we will create your Goyo Cloud account after
          verification.
        </h2>
        <form
          className="mt-6 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            if (email) onStart(email);
          }}
        >
          <label className="block">
            <span className="text-[#aab5a5] text-sm">Email address</span>
            <input
              className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#191d19] px-4 py-3 text-[#f3f0df] outline-none placeholder:text-[#687064] focus:ring-4 focus:ring-[#d9be7f]/20"
              onChange={(event) => setEmail(event.target.value.trim())}
              placeholder="writer@example.com"
              type="email"
              value={email}
            />
          </label>
          <button
            className="mt-4 w-full rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594]"
            disabled={!email}
            type="submit"
          >
            Send sign-in code
          </button>
        </form>
        {statusMessage(status)}
      </Panel>
    </CloudShell>
  );
}

function VerifyPage({
  email,
  onRouteChange,
  onVerify,
  status,
  user,
}: {
  email: string;
  onRouteChange: (page: Page) => void;
  onVerify: (code: string) => void;
  status: string | null;
  user: CloudUser | null;
}): ReactElement {
  const [code, setCode] = useState('');

  return (
    <CloudShell
      eyebrow="Verification"
      onRouteChange={onRouteChange}
      title="Enter the code we sent to your email."
      user={user}
    >
      <Panel>
        <p className="text-[#8f978b] text-sm">
          Code sent to <span className="text-[#f3f0df]">{email}</span>. New emails automatically
          create an account.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (code) onVerify(code);
          }}
        >
          <label className="block">
            <span className="text-[#aab5a5] text-sm">Six-digit code</span>
            <input
              className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#0f1210] px-4 py-3 text-[#f3f0df] outline-none placeholder:text-[#687064] focus:ring-4 focus:ring-[#d9be7f]/20"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              placeholder="000000"
              value={code}
            />
          </label>
          <button
            className="rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594] disabled:opacity-50"
            disabled={code.length !== 6}
            type="submit"
          >
            Verify code
          </button>
        </form>
        {statusMessage(status)}
      </Panel>
    </CloudShell>
  );
}

function signOutBlock(hasUser: boolean, onLogout: () => void): ReactElement {
  if (!hasUser) return <></>;

  return (
    <div className="mt-6">
      <button
        className="rounded-full border border-[#f3f0df]/20 px-6 py-2.5 font-semibold text-[#f3f0df] text-sm transition hover:bg-[#d86b53]/20 hover:border-[#d86b53]/40"
        onClick={onLogout}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}

function AccountPage({
  onLogout,
  onRouteChange,
  user,
}: {
  onLogout: () => void;
  onRouteChange: (page: Page) => void;
  user: CloudUser | null;
}): ReactElement {
  const hasUser = !!user;

  return (
    <CloudShell
      eyebrow="Account"
      onRouteChange={onRouteChange}
      title="Cloud status before billing complexity."
      user={user}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Account</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">
            {hasUser ? user.email : 'Signed out'}
          </p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            {hasUser
              ? 'Open signup account. Payment and plan selection will be added later.'
              : 'Sign in with your email to see account status.'}
          </p>
        </Panel>
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Cloud sync</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">
            {hasUser ? 'Available' : 'Unauthenticated'}
          </p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            Usage limits stay disabled while auth and sync are tested. Sync entitlement enforcement
            is deferred.
          </p>
        </Panel>
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Billing</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">Deferred</p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            Payment will be added after the account foundation ships.
          </p>
        </Panel>
      </div>
      {signOutBlock(hasUser, onLogout)}
    </CloudShell>
  );
}

function BillingPage({
  onRouteChange,
  user,
}: {
  onRouteChange: (page: Page) => void;
  user: CloudUser | null;
}): ReactElement {
  return (
    <CloudShell
      eyebrow="Billing"
      onRouteChange={onRouteChange}
      title="Payment is intentionally parked."
      user={user}
    >
      <Panel>
        <p className="max-w-2xl text-[#b8b9ac] leading-7">
          This route reserves the account surface for future payment work. Sync availability stays
          unrestricted during the Goyo Cloud auth milestone so hosted login and multi-device sync
          can be tested without plan gates.
        </p>
      </Panel>
    </CloudShell>
  );
}

function DocumentsPage({
  docProps,
  onRouteChange,
  onSelectDocument,
  user,
}: {
  docProps: DocumentRenderProps;
  onRouteChange: (page: Page) => void;
  onSelectDocument: (id: string) => void;
  user: CloudUser | null;
}): ReactElement {
  const selectedDocument = useMemo(() => {
    if (!docProps.selectedDocumentId) return null;
    return docProps.documents.find((doc) => doc.id === docProps.selectedDocumentId) ?? null;
  }, [docProps.documents, docProps.selectedDocumentId]);

  if (!user) {
    return (
      <CloudShell
        eyebrow="Documents"
        onRouteChange={onRouteChange}
        title="Sign in to see your documents."
        user={user}
      >
        <Panel>
          <p className="text-[#b8b9ac] text-sm">
            Documents synced from the Goyo desktop app appear here after you sign in.
          </p>
        </Panel>
      </CloudShell>
    );
  }

  if (selectedDocument) {
    return (
      <CloudShell
        eyebrow="Document"
        onRouteChange={onRouteChange}
        title={selectedDocument.title || 'Untitled'}
        user={user}
      >
        <div className="mb-6">
          <button
            className="rounded-full border border-[#f3f0df]/20 px-4 py-2 text-[#b8b9ac] text-sm transition hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
            onClick={() => onRouteChange('documents')}
            type="button"
          >
            Back to documents
          </button>
        </div>
        <DocumentContent content={docProps.documentContent} />
      </CloudShell>
    );
  }

  if (docProps.documents.length === 0) {
    return (
      <CloudShell
        eyebrow="Documents"
        onRouteChange={onRouteChange}
        title="Your writing"
        user={user}
      >
        <Panel>
          <p className="text-[#b8b9ac] text-sm">
            No synced documents yet. Start writing in the Goyo desktop app and enable sync to see
            your work here.
          </p>
        </Panel>
      </CloudShell>
    );
  }

  return (
    <CloudShell eyebrow="Documents" onRouteChange={onRouteChange} title="Your writing" user={user}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docProps.documents.map((doc) => (
          <button
            className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 text-left shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur transition hover:border-[#d9be7f]/30 hover:bg-[#272d26]/72"
            key={doc.id}
            onClick={() => onSelectDocument(doc.id)}
            type="button"
          >
            <p className="font-serif text-lg leading-snug tracking-[-0.03em] text-[#f3f0df]">
              {doc.title || 'Untitled'}
            </p>
            <p className="mt-2 text-[#9fa99b] text-xs">
              {doc.kind}
              {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleDateString()}` : ''}
            </p>
          </button>
        ))}
      </div>
    </CloudShell>
  );
}

function DocumentContent({ content }: { content: string | null }): ReactElement {
  if (!content) {
    return (
      <Panel>
        <p className="text-[#b8b9ac] text-sm">Loading document content…</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div
        className="prose prose-invert prose-lg max-w-none font-serif leading-relaxed text-[#eef0e8]"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: snapshot content is from the user's own D1 data via authenticated API
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Panel>
  );
}

function CloudShell({
  children,
  eyebrow,
  onRouteChange,
  title,
  user,
}: {
  children: ReactElement | ReactElement[];
  eyebrow: string;
  onRouteChange: (page: Page) => void;
  title: string;
  user?: CloudUser | null;
}): ReactElement {
  return (
    <main className="min-h-screen overflow-hidden bg-[#151816] px-5 py-6 text-[#eef0e8] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(217,190,127,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(126,153,125,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="mb-16 flex items-center justify-between rounded-full border border-[#f3f0df]/10 bg-[#1d221d]/75 px-4 py-3 backdrop-blur">
          <button
            className="font-semibold text-sm tracking-[0.22em] uppercase"
            onClick={() => onRouteChange('login')}
            type="button"
          >
            Goyo Cloud
          </button>
          <div className="flex gap-2 text-sm">
            {user ? (
              <button
                className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
                onClick={() => onRouteChange('documents')}
                type="button"
              >
                Documents
              </button>
            ) : null}
            <button
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              onClick={() => onRouteChange('account')}
              type="button"
            >
              Account
            </button>
            <button
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              onClick={() => onRouteChange('billing')}
              type="button"
            >
              Billing
            </button>
          </div>
        </nav>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            {eyebrow}
          </p>
          <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function Panel({ children }: { children: ReactElement | ReactElement[] }): ReactElement {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

function getInitialPage(): Page {
  const pathname = window.location.pathname;

  if (pathname === '/verify') return 'verify';
  if (pathname === '/account') return 'account';
  if (pathname === '/billing') return 'billing';
  if (pathname.startsWith('/documents')) return 'documents';

  return 'login';
}
