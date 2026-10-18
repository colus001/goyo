import { QUICK_DRAFTS_BOOK_ID, QUICK_DRAFTS_BOOK_TITLE } from '@writer/core';
import { APP_NAME } from '@writer/shared';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileApp } from '../mobile-app-context';
import { styles } from '../screens/mobile-library-styles';

export function MobileNavigation() {
  const { closeMenu, isMenuOpen, isSidebarVisible, toggleMenu } = useMobileApp();

  if (isSidebarVisible) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.sidebar}>
        <MobileMenuContent onClose={toggleMenu} />
      </SafeAreaView>
    );
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeMenu}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape']}
      transparent
      visible={isMenuOpen}
    >
      <View style={styles.menuOverlay}>
        <Pressable
          accessibilityLabel="Close navigation menu"
          accessibilityRole="button"
          onPress={closeMenu}
          style={styles.menuBackdrop}
        />
        <SafeAreaView
          accessibilityViewIsModal
          onAccessibilityEscape={closeMenu}
          style={styles.menuPanel}
        >
          <MobileMenuContent onClose={closeMenu} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function MobileMenuContent({ onClose }: { onClose(): void }) {
  const { auth, closeMenu, workspace } = useMobileApp();
  const books = workspace.session?.books ?? [];
  const activeBook = books.find((book) => book.id === workspace.session?.activeBookId);

  return (
    <ScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
      <Pressable
        accessibilityLabel="Close navigation"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.drawerClose}
      >
        <Text style={styles.drawerMeta}>Close sidebar</Text>
      </Pressable>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerEyebrow}>{APP_NAME}</Text>
        <Text accessibilityRole="header" style={styles.drawerTitle}>
          {activeBook && workspace.screen !== 'home' ? activeBook.title : 'Library'}
        </Text>
        <Text style={styles.drawerMeta}>{auth.user?.email ?? 'Local writing'}</Text>
        <Text style={styles.drawerMeta}>{workspace.status}</Text>
      </View>

      <DrawerItem
        label="Library"
        onPress={() => void navigateFromMenu(workspace, closeMenu, () => router.navigate('/'))}
      />
      <DrawerItem
        label={QUICK_DRAFTS_BOOK_TITLE}
        onPress={() =>
          void navigateFromMenu(workspace, closeMenu, () => openQuickDrafts(workspace))
        }
      />

      {activeBook && workspace.screen !== 'home' ? <BookNavigation bookId={activeBook.id} /> : null}

      <DrawerSectionTitle label="Books" />
      {books.map((book) => (
        <DrawerItem
          key={book.id}
          label={book.title}
          selected={workspace.screen === 'book' && activeBook?.id === book.id}
          onPress={() =>
            void navigateFromMenu(workspace, closeMenu, () => {
              workspace.openBook(book.id);
              router.navigate(`/book/${encodeURIComponent(book.id)}`);
            })
          }
        />
      ))}

      <DrawerSectionTitle label="Account" />
      <DrawerItem
        label="Settings"
        onPress={() =>
          void navigateFromMenu(workspace, closeMenu, () => router.navigate('/settings'))
        }
      />
    </ScrollView>
  );
}

function BookNavigation({ bookId }: { bookId: string }) {
  const { workspace } = useMobileApp();
  const chapters = (workspace.session?.chapters ?? []).filter(
    (chapter) => chapter.bookId === bookId,
  );
  const documents = (workspace.session?.documents ?? []).filter(
    (document) => document.bookId === bookId,
  );

  return (
    <>
      <DrawerSectionTitle label="Writing" />
      {documents
        .filter((document) => document.chapterId === null)
        .map((document) => (
          <EpisodeNavigationItem document={document} key={document.id} />
        ))}
      {chapters.map((chapter) => (
        <ChapterNavigation chapter={chapter} key={chapter.id} />
      ))}
      {chapters.length === 0 && documents.length === 0 ? (
        <Text style={styles.drawerEmptyText}>
          No episodes yet. Create one in the book workspace.
        </Text>
      ) : null}
    </>
  );
}

type MobileSession = NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>;

function ChapterNavigation({ chapter }: { chapter: MobileSession['chapters'][number] }) {
  const { expandedChapterIds, setChapterExpanded, workspace } = useMobileApp();
  const documents = (workspace.session?.documents ?? []).filter(
    (document) => document.chapterId === chapter.id,
  );
  const activeDocumentId = workspace.session?.activeDocumentId;
  const containsSelection = documents.some((document) => document.id === activeDocumentId);
  const isExpanded = expandedChapterIds[chapter.id] ?? containsSelection;

  useEffect(() => {
    if (activeDocumentId && containsSelection) {
      setChapterExpanded(chapter.id, true);
    }
  }, [activeDocumentId, chapter.id, containsSelection, setChapterExpanded]);

  return (
    <View style={styles.drawerChapter}>
      <Pressable
        accessibilityLabel={chapter.title}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setChapterExpanded(chapter.id, !isExpanded)}
        style={styles.drawerChapterHeading}
      >
        <Text style={styles.drawerMeta}>{isExpanded ? '⌄' : '›'}</Text>
        <Text style={styles.drawerChapterText}>{chapter.title}</Text>
      </Pressable>
      {isExpanded ? (
        <View style={[styles.drawerChapter, styles.drawerEpisode]}>
          {documents.map((document) => (
            <EpisodeNavigationItem document={document} key={document.id} />
          ))}
          {documents.length === 0 ? (
            <Text style={styles.drawerEmptyText}>No episodes yet.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function EpisodeNavigationItem({ document }: { document: MobileSession['documents'][number] }) {
  const { closeMenu, workspace } = useMobileApp();

  return (
    <DrawerItem
      label={document.title || (document.kind === 'draft' ? 'Untitled draft' : 'Untitled episode')}
      onPress={() =>
        void navigateFromMenu(workspace, closeMenu, () => {
          workspace.openDocument(document.id);
          router.navigate(`/editor/${encodeURIComponent(document.id)}`);
        })
      }
      selected={
        workspace.screen === 'editor' && workspace.session?.activeDocumentId === document.id
      }
    />
  );
}

function DrawerSectionTitle({ label }: { label: string }) {
  return <Text style={styles.drawerSectionTitle}>{label}</Text>;
}

function DrawerItem({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        selected && styles.drawerItemSelected,
        pressed && styles.pressedRow,
      ]}
    >
      <Text style={styles.drawerItemText}>{label}</Text>
    </Pressable>
  );
}

async function navigateFromMenu(
  workspace: ReturnType<typeof useMobileApp>['workspace'],
  closeMenu: () => void,
  navigate: () => void,
) {
  if (workspace.screen === 'editor' && !(await workspace.flushActiveDocumentBody())) {
    return;
  }

  closeMenu();
  navigate();
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
