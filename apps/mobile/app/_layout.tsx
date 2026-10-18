import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileAppProvider, useMobileApp } from '../src/mobile-app-context';
import { MobileNavigation } from '../src/navigation/mobile-drawer-content';
import { styles } from '../src/screens/mobile-library-styles';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileAppProvider>
        <MobileAppShell />
      </MobileAppProvider>
    </SafeAreaProvider>
  );
}

function MobileAppShell() {
  return (
    <View style={styles.appShell}>
      <MobileNavigation />
      <View style={styles.appMain}>
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
      </View>
    </View>
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
