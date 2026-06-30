import { QUICK_DRAFTS_BOOK_ID, QUICK_DRAFTS_BOOK_TITLE } from '@writer/core';
import { APP_NAME } from '@writer/shared';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMobileApp } from '../mobile-app-context';
import { styles } from '../screens/mobile-library-styles';

export function MobileMenuOverlay() {
  const { closeMenu, isMenuOpen } = useMobileApp();

  if (!isMenuOpen) {
    return null;
  }

  return (
    <View style={styles.menuOverlay}>
      <Pressable accessibilityRole="button" onPress={closeMenu} style={styles.menuBackdrop} />
      <View style={styles.menuPanel}>
        <MobileMenuContent />
      </View>
    </View>
  );
}

function MobileMenuContent() {
  const { auth, closeMenu, workspace } = useMobileApp();
  const books = workspace.session?.books ?? [];
  const recentDocuments = [...(workspace.session?.documents ?? [])]
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerEyebrow}>{APP_NAME}</Text>
        <Text style={styles.drawerTitle}>Navigate</Text>
        <Text style={styles.drawerMeta}>{auth.user?.email ?? 'Local writing'}</Text>
        <Text style={styles.drawerMeta}>{workspace.status}</Text>
      </View>

      <DrawerItem
        label="Library"
        onPress={() => {
          closeMenu();
          router.navigate('/');
        }}
      />
      <DrawerItem
        label={QUICK_DRAFTS_BOOK_TITLE}
        onPress={() => {
          closeMenu();
          openQuickDrafts(workspace);
        }}
      />

      <DrawerSectionTitle label="Continue" />
      {recentDocuments.length === 0 ? (
        <Text style={styles.drawerEmptyText}>No recent episodes yet.</Text>
      ) : (
        recentDocuments.map((document) => (
          <DrawerItem
            key={document.id}
            label={
              document.title || (document.kind === 'draft' ? 'Untitled draft' : 'Untitled episode')
            }
            onPress={() => {
              closeMenu();
              workspace.openDocument(document.id);
              router.navigate(`/editor/${encodeURIComponent(document.id)}`);
            }}
          />
        ))
      )}

      <DrawerSectionTitle label="Books" />
      {books.map((book) => (
        <DrawerItem
          key={book.id}
          label={book.title}
          onPress={() => {
            closeMenu();
            workspace.openBook(book.id);
            router.navigate(`/book/${encodeURIComponent(book.id)}`);
          }}
        />
      ))}

      <DrawerSectionTitle label="Account" />
      <DrawerItem
        label="Settings"
        onPress={() => {
          closeMenu();
          router.navigate('/settings');
        }}
      />
    </ScrollView>
  );
}

function DrawerSectionTitle({ label }: { label: string }) {
  return <Text style={styles.drawerSectionTitle}>{label}</Text>;
}

function DrawerItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.drawerItem}>
      <Text style={styles.drawerItemText}>{label}</Text>
    </Pressable>
  );
}

function openQuickDrafts(workspace: ReturnType<typeof useMobileApp>['workspace']) {
  const quickDrafts = workspace.session?.books.find((book) => book.id === QUICK_DRAFTS_BOOK_ID);

  if (quickDrafts) {
    workspace.openBook(quickDrafts.id);
    router.navigate(`/book/${encodeURIComponent(quickDrafts.id)}`);
    return;
  }

  workspace.startQuickDraft();
}
