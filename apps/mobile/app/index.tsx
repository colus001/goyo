import { router } from 'expo-router';
import { HomeScreen } from '../src/screens/mobile-routed-screens';

export default function HomeRoute() {
  return (
    <HomeScreen
      onOpenBook={(bookId) => router.push(`/book/${encodeURIComponent(bookId)}`)}
      onOpenDocument={(documentId) => router.push(`/editor/${encodeURIComponent(documentId)}`)}
      onOpenSettings={() => router.push('/settings')}
    />
  );
}
