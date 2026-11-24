import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef } from 'react';
import { useMobileApp } from '../../src/mobile-app-context';
import { EditorScreen } from '../../src/screens/mobile-routed-screens';

export default function EditorRoute() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const navigation = useNavigation();
  const flushingRef = useRef(false);
  const { workspace } = useMobileApp();

  usePreventRemove(true, ({ data }) => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    void workspace
      .flushActiveDocumentBody()
      .then((didFlush) => {
        if (didFlush) navigation.dispatch(data.action);
      })
      .finally(() => {
        flushingRef.current = false;
      });
  });

  return (
    <EditorScreen
      documentId={documentId}
      onBackToBook={(bookId) => goBackOrReplace(`/book/${encodeURIComponent(bookId)}` as const)}
      onOpenLibrary={() => goBackOrReplace('/')}
      onOpenSettings={() => router.navigate('/settings')}
    />
  );
}

function goBackOrReplace(path: '/' | `/book/${string}`) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.dismissTo(path);
}
