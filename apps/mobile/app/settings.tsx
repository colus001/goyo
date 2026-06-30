import { router } from 'expo-router';
import { useMobileApp } from '../src/mobile-app-context';
import { SettingsScreen } from '../src/screens/mobile-settings-screen';

export default function SettingsRoute() {
  const { auth, workspace } = useMobileApp();

  return <SettingsScreen auth={auth} workspace={{ ...workspace, goBackToBook: closeSettings }} />;
}

function closeSettings() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.dismissTo('/');
}
