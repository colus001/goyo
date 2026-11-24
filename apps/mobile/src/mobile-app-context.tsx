import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useWindowDimensions } from 'react-native';
import { type MobileAuthState, useMobileAuth } from './auth/use-mobile-auth';
import type { MobileWorkspaceState } from './workspace/mobile-workspace-types';
import { useMobileWorkspace } from './workspace/use-mobile-workspace';

interface MobileAppContextValue {
  auth: MobileAuthState;
  closeMenu(): void;
  expandedChapterIds: Record<string, boolean>;
  isMenuOpen: boolean;
  isSidebarVisible: boolean;
  toggleMenu(): void;
  setChapterExpanded(chapterId: string, expanded: boolean): void;
  workspace: MobileWorkspaceState;
}

const MobileAppContext = createContext<MobileAppContextValue | null>(null);

export function MobileAppProvider({ children }: PropsWithChildren) {
  const auth = useMobileAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});
  const setChapterExpanded = useCallback((chapterId: string, expanded: boolean) => {
    setExpandedChapterIds((current) =>
      current[chapterId] === expanded ? current : { ...current, [chapterId]: expanded },
    );
  }, []);
  const { width } = useWindowDimensions();
  const isWideWindow = width >= 1100;
  const isSidebarVisible = isWideWindow && !isSidebarCollapsed;
  useEffect(() => {
    if (isWideWindow) {
      setMenuOpen(false);
    }
  }, [isWideWindow]);
  const workspace = useMobileWorkspace(auth.token);

  return (
    <MobileAppContext.Provider
      value={{
        auth,
        closeMenu: () => setMenuOpen(false),
        expandedChapterIds,
        isMenuOpen,
        isSidebarVisible,
        toggleMenu: () => {
          if (isWideWindow) {
            setSidebarCollapsed((collapsed) => !collapsed);
            setMenuOpen(false);
          } else {
            setMenuOpen((open) => !open);
          }
        },
        setChapterExpanded,
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
