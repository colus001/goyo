import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { CloudAuthPanel } from '../auth/cloud-auth-panel';
import type { MobileAuthState } from '../auth/use-mobile-auth';
import { GOYO_CLOUD_API_URL } from '../config/mobile-cloud-api';
import { styles } from './mobile-library-styles';

interface SettingsWorkspace {
  clientId: string | null;
  goBackToBook(): void;
  status: string;
  syncNow(token: string | null): void;
}

export function SettingsScreen({
  auth,
  workspace,
}: {
  auth: MobileAuthState;
  workspace: SettingsWorkspace;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.editorTopRow}>
          <Pressable
            accessibilityRole="button"
            onPress={workspace.goBackToBook}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <View style={styles.statusPill}>
            <View
              style={isErrorStatus(workspace.status) ? styles.statusDotError : styles.statusDot}
            />
            <Text style={styles.statusText}>{workspace.status}</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Quiet controls</Text>
          <Text style={styles.subtitle}>
            Account, sync readiness, and local environment details.
          </Text>
        </View>

        <CloudAuthPanel auth={auth} clientId={workspace.clientId} />
        <SyncCard auth={auth} workspace={workspace} />
        <EnvironmentCard clientId={workspace.clientId} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SyncCard({ auth, workspace }: { auth: MobileAuthState; workspace: SettingsWorkspace }) {
  const canSync = !!auth.token && !!workspace.clientId && workspace.status !== 'Syncing';

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Sync</Text>
      <Text style={styles.cardTitle}>Cloud backup</Text>
      <Text style={styles.cardBody}>
        Push local CRDT updates and pull remote document changes for books already on this device.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!canSync}
        onPress={() => workspace.syncNow(auth.token)}
        style={canSync ? styles.primaryButton : styles.secondaryButton}
      >
        <Text style={canSync ? styles.primaryButtonText : styles.secondaryButtonText}>
          {workspace.status === 'Syncing' ? 'Syncing...' : 'Sync now'}
        </Text>
      </Pressable>
    </View>
  );
}

function isErrorStatus(status: string) {
  return status === 'Save failed' || status === 'Sync failed';
}

export function CloudSummaryCard({
  auth,
  onOpenSettings,
}: {
  auth: MobileAuthState;
  onOpenSettings: () => void;
}) {
  const label = auth.user ? `Cloud: ${auth.user.email}` : 'Cloud: local only';

  return (
    <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.cloudSummaryCard}>
      <Text style={styles.cardLabel}>Goyo Cloud</Text>
      <Text style={styles.cloudSummaryText}>{label}</Text>
    </Pressable>
  );
}

function EnvironmentCard({ clientId }: { clientId: string | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Environment</Text>
      <Text style={styles.cardTitle}>Mobile local app</Text>
      <Text style={styles.cardBody}>API: {GOYO_CLOUD_API_URL}</Text>
      <Text style={styles.monoText}>Client ID: {clientId ?? 'Preparing...'}</Text>
    </View>
  );
}
