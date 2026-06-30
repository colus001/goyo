import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { type MobileAuthState, useMobileAuth } from './auth/use-mobile-auth';
import type { MobileWorkspaceState } from './workspace/mobile-workspace-types';
import { useMobileWorkspace } from './workspace/use-mobile-workspace';

interface MobileAppContextValue {
  auth: MobileAuthState;
  closeMenu(): void;
  isMenuOpen: boolean;
  openMenu(): void;
  workspace: MobileWorkspaceState;
}

const MobileAppContext = createContext<MobileAppContextValue | null>(null);

export function MobileAppProvider({ children }: PropsWithChildren) {
  const auth = useMobileAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const workspace = useMobileWorkspace(auth.token);

  return (
    <MobileAppContext.Provider
      value={{
        auth,
        closeMenu: () => setMenuOpen(false),
        isMenuOpen,
        openMenu: () => setMenuOpen(true),
        workspace,
      }}
    >
      {children}
    </MobileAppContext.Provider>
  );
}

export function useMobileApp() {
  const context = useContext(MobileAppContext);

  if (!context) {
    throw new Error('useMobileApp must be used inside MobileAppProvider.');
  }

  return context;
}
