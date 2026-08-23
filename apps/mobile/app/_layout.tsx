import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { MobileAppProvider, useMobileApp } from '../src/mobile-app-context';
import { MobileMenuOverlay } from '../src/navigation/mobile-drawer-content';

export default function RootLayout() {
  return (
    <MobileAppProvider>
      <RestoreLastRoute />
      <Stack
        screenOptions={{
          animation: 'none',
          contentStyle: { backgroundColor: '#f6efe5' },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="book/[bookId]" options={{ headerShown: false }} />
        <Stack.Screen name="editor/[documentId]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <MobileMenuOverlay />
    </MobileAppProvider>
  );
}

function RestoreLastRoute() {
  const hasRestoredRoute = useRef(false);
  const { workspace } = useMobileApp();

  useEffect(() => {
    if (hasRestoredRoute.current || workspace.isLoading) {
      return;
    }

    hasRestoredRoute.current = true;

    if (workspace.screen === 'editor' && workspace.session?.activeDocumentId) {
      router.replace(`/editor/${encodeURIComponent(workspace.session.activeDocumentId)}`);
      return;
    }

    if (workspace.screen === 'book' && workspace.session?.activeBookId) {
      router.replace(`/book/${encodeURIComponent(workspace.session.activeBookId)}`);
      return;
    }

    router.replace('/');
  }, [workspace.isLoading, workspace.screen, workspace.session]);

  return null;
}
