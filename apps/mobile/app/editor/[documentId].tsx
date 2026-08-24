import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useMobileApp } from '../../src/mobile-app-context';
import { EditorScreen } from '../../src/screens/mobile-routed-screens';

export default function EditorRoute() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const navigation = useNavigation();
  const allowNextRemovalRef = useRef(false);
  const { workspace } = useMobileApp();

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowNextRemovalRef.current || !workspace.pendingBodySave) {
          return;
        }

        event.preventDefault();
        void workspace.flushActiveDocumentBody().then((didFlush) => {
          if (didFlush) {
            allowNextRemovalRef.current = true;
            navigation.dispatch(event.data.action);
          }
        });
      }),
    [navigation, workspace],
  );

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
