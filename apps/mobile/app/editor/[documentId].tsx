import { router, useLocalSearchParams } from 'expo-router';
import { EditorScreen } from '../../src/screens/mobile-routed-screens';

export default function EditorRoute() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();

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
