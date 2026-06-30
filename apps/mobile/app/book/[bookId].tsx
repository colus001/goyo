import { router, useLocalSearchParams } from 'expo-router';
import { BookScreen } from '../../src/screens/mobile-routed-screens';

export default function BookRoute() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  return (
    <BookScreen
      bookId={bookId}
      onOpenDocument={(documentId) => router.push(`/editor/${encodeURIComponent(documentId)}`)}
      onOpenLibrary={() => goBackOrReplace('/')}
    />
  );
}

function goBackOrReplace(path: '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.dismissTo(path);
}
