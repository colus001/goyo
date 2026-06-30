// biome-ignore lint/nursery/noExcessiveLinesPerFile: Route screen components share small mobile-only affordances for now.
import {
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_BOOK_TITLE,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
import { APP_NAME } from '@writer/shared';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMobileApp } from '../mobile-app-context';
import { styles } from './mobile-library-styles';
import { CloudSummaryCard } from './mobile-settings-screen';

interface HomeScreenProps {
  onOpenBook(bookId: string): void;
  onOpenDocument(documentId: string): void;
  onOpenSettings(): void;
}

interface BookScreenProps {
  bookId: string | undefined;
  onOpenDocument(documentId: string): void;
  onOpenLibrary(): void;
}

interface EditorScreenProps {
  documentId: string | undefined;
  onBackToBook(bookId: string): void;
  onOpenLibrary(): void;
  onOpenSettings(): void;
}

export function HomeScreen({ onOpenBook, onOpenDocument, onOpenSettings }: HomeScreenProps) {
  const { auth, workspace } = useMobileApp();
  const books = workspace.session?.books ?? [];
  const recentDocuments = [...(workspace.session?.documents ?? [])]
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 3);

  useEffect(() => {
    workspace.showHome();
  }, [workspace]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MenuButton />
          <Text style={styles.eyebrow}>{APP_NAME}</Text>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Open a book, continue an episode, or start quickly.</Text>
        </View>

        <StatusPill status={workspace.status} />
        <CloudSummaryCard auth={auth} onOpenSettings={onOpenSettings} />

        {books.length > 0 ? (
          <View style={styles.stack}>
            <ContinueWritingSection
              documents={recentDocuments}
              onOpenDocument={(documentId) => {
                workspace.openDocument(documentId);
                onOpenDocument(documentId);
              }}
            />
            <HomeBooksSection
              books={books}
              onOpenBook={(bookId) => {
                workspace.openBook(bookId);
                onOpenBook(bookId);
              }}
            />
            <View style={styles.actionRow}>
              <ActionButton label="New book" onPress={workspace.createBook} />
              <ActionButton
                label="Quick Draft"
                onPress={workspace.startQuickDraft}
                variant="secondary"
              />
              <ActionButton label="Settings" onPress={onOpenSettings} variant="secondary" />
            </View>
          </View>
        ) : (
          <EmptyLibraryPanel workspace={workspace} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BookScreen({ bookId, onOpenDocument, onOpenLibrary }: BookScreenProps) {
  const { workspace } = useMobileApp();
  const activeBookId = bookId ? decodeURIComponent(bookId) : null;
  const activeBook = workspace.session?.books.find((book) => book.id === activeBookId);
  const chapters =
    workspace.session?.chapters.filter((chapter) => chapter.bookId === activeBookId) ?? [];
  const documents =
    workspace.session?.documents.filter((document) => document.bookId === activeBookId) ?? [];
  const chapterlessDocuments = documents.filter((document) => document.chapterId === null);

  useEffect(() => {
    if (activeBookId) {
      workspace.openBook(activeBookId);
    }
  }, [activeBookId, workspace]);

  if (!activeBook || !activeBookId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ActionButton label="Back to Library" onPress={onOpenLibrary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.editorTopRow}>
          <View style={styles.actionRowCompact}>
            <MenuButton />
            <Pressable
              accessibilityRole="button"
              onPress={onOpenLibrary}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Library</Text>
            </Pressable>
          </View>
          <StatusPill status={workspace.status} />
        </View>

        <BookSummaryCard
          chapterCount={chapters.length}
          documentCount={documents.length}
          isQuickDrafts={activeBook.id === QUICK_DRAFTS_BOOK_ID}
          title={activeBook.title}
          workspace={workspace}
        />
        <WritingUnitsSection
          activeBookId={activeBook.id}
          chapterlessDocuments={chapterlessDocuments}
          chapters={chapters}
          documents={documents}
          onOpenDocument={(documentId) => {
            workspace.openDocument(documentId);
            onOpenDocument(documentId);
          }}
          workspace={workspace}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function EditorScreen({
  documentId,
  onBackToBook,
  onOpenLibrary,
  onOpenSettings,
}: EditorScreenProps) {
  const { auth, workspace } = useMobileApp();
  const activeDocumentId = documentId ? decodeURIComponent(documentId) : null;
  const activeDocument = workspace.session?.documents.find(
    (document) => document.id === activeDocumentId,
  );

  useEffect(() => {
    if (activeDocumentId) {
      workspace.openDocument(activeDocumentId);
    }
  }, [activeDocumentId, workspace]);

  if (!activeDocument) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ActionButton label="Back to Library" onPress={onOpenLibrary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.editorShell}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.editorTopRow}>
            <View style={styles.actionRowCompact}>
              <MenuButton />
              <Pressable
                accessibilityRole="button"
                onPress={() => onBackToBook(activeDocument.bookId)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            </View>
            <StatusPill status={workspace.status} />
          </View>

          <View style={styles.editorCard}>
            <Text style={styles.cardLabel}>{activeDocument.kind}</Text>
            <TextInput
              onChangeText={workspace.renameActiveDocumentTitle}
              placeholder={getEditorTitlePlaceholder(activeDocument.kind)}
              placeholderTextColor="#a99b8c"
              style={styles.titleInput}
              value={activeDocument.title}
            />
            <TextInput
              multiline
              onChangeText={workspace.saveActiveDocumentBody}
              placeholder="Start writing..."
              placeholderTextColor="#958678"
              style={styles.bodyInput}
              value={workspace.activeDocumentBody}
            />
            <Text style={styles.editorMetaText}>
              {formatWordCount(workspace.activeDocumentBody)} ·{' '}
              {workspace.pendingBodySave ? 'Saving soon' : 'Saved locally'}
            </Text>
          </View>
          <CloudSummaryCard auth={auth} onOpenSettings={onOpenSettings} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyLibraryPanel({
  workspace,
}: {
  workspace: ReturnType<typeof useMobileApp>['workspace'];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Library</Text>
      <Text style={styles.cardTitle}>No local books yet</Text>
      <Text style={styles.cardBody}>
        Create a book for a longer project, or start in {QUICK_DRAFTS_BOOK_TITLE} without choosing a
        structure first.
      </Text>
      <View style={styles.actionRow}>
        <ActionButton label="New book" onPress={workspace.createBook} />
        <ActionButton label="Quick Draft" onPress={workspace.startQuickDraft} variant="secondary" />
      </View>
    </View>
  );
}

function ContinueWritingSection({
  documents,
  onOpenDocument,
}: {
  documents: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['documents'];
  onOpenDocument(documentId: string): void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Continue writing</Text>
      {documents.length === 0 ? (
        <Text style={styles.emptyText}>Start a draft or open a book to continue writing.</Text>
      ) : (
        documents.map((document) => (
          <WritingUnitRow
            key={document.id}
            onPress={() => onOpenDocument(document.id)}
            title={document.title || getEditorTitlePlaceholder(document.kind)}
          />
        ))
      )}
    </View>
  );
}

function HomeBooksSection({
  books,
  onOpenBook,
}: {
  books: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['books'];
  onOpenBook(bookId: string): void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Books</Text>
      {books.map((book) => (
        <BookRow
          accentColor={book.accentColor}
          key={book.id}
          onPress={() => onOpenBook(book.id)}
          title={book.title}
        />
      ))}
    </View>
  );
}

function BookSummaryCard({
  chapterCount,
  documentCount,
  isQuickDrafts,
  title,
  workspace,
}: {
  chapterCount: number;
  documentCount: number;
  isQuickDrafts: boolean;
  title: string;
  workspace: ReturnType<typeof useMobileApp>['workspace'];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{isQuickDrafts ? 'System book' : 'Book'}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{formatBookSummary(chapterCount, documentCount)}</Text>
      <View style={styles.actionRow}>
        {isQuickDrafts ? null : (
          <ActionButton label="New chapter" onPress={workspace.createChapter} variant="secondary" />
        )}
        <ActionButton
          label={isQuickDrafts ? 'New draft' : 'New episode'}
          onPress={() => workspace.createEpisode(null)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function WritingUnitsSection({
  activeBookId,
  chapterlessDocuments,
  chapters,
  documents,
  onOpenDocument,
  workspace,
}: {
  activeBookId: string;
  chapterlessDocuments: NonNullable<
    ReturnType<typeof useMobileApp>['workspace']['session']
  >['documents'];
  chapters: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['chapters'];
  documents: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['documents'];
  onOpenDocument(documentId: string): void;
  workspace: ReturnType<typeof useMobileApp>['workspace'];
}) {
  const isQuickDrafts = activeBookId === QUICK_DRAFTS_BOOK_ID;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Writing units</Text>
      {chapterlessDocuments.map((document) => (
        <WritingUnitRow
          key={document.id}
          onPress={() => onOpenDocument(document.id)}
          title={document.title || 'Untitled episode'}
        />
      ))}
      {chapters.map((chapter) => (
        <ChapterWritingUnits
          chapter={chapter}
          documents={documents.filter((document) => document.chapterId === chapter.id)}
          isQuickDrafts={isQuickDrafts}
          key={chapter.id}
          onOpenDocument={onOpenDocument}
          workspace={workspace}
        />
      ))}
      {documents.length === 0 ? <Text style={styles.emptyText}>No episodes yet.</Text> : null}
    </View>
  );
}

function ChapterWritingUnits({
  chapter,
  documents,
  isQuickDrafts,
  onOpenDocument,
  workspace,
}: {
  chapter: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['chapters'][number];
  documents: NonNullable<ReturnType<typeof useMobileApp>['workspace']['session']>['documents'];
  isQuickDrafts: boolean;
  onOpenDocument(documentId: string): void;
  workspace: ReturnType<typeof useMobileApp>['workspace'];
}) {
  return (
    <View style={styles.chapterCard}>
      <View style={styles.chapterHeaderRow}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        {isQuickDrafts ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => workspace.createEpisode(chapter.id)}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>Add episode</Text>
          </Pressable>
        )}
      </View>
      {documents.map((document) => (
        <WritingUnitRow
          key={document.id}
          onPress={() => onOpenDocument(document.id)}
          title={getDocumentTitle(document.title, chapter.id)}
        />
      ))}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={variant === 'primary' ? styles.primaryButton : styles.secondaryButton}
    >
      <Text style={variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function BookRow({
  accentColor,
  onPress,
  title,
}: {
  accentColor: string;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.bookRow, pressed ? styles.pressedRow : null]}
    >
      <View style={[styles.bookAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.bookTitle}>{title}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

function WritingUnitRow({ onPress, title }: { onPress: () => void; title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.documentRow, pressed ? styles.pressedRow : null]}
    >
      <Text style={styles.documentTitle}>{title}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <View style={styles.statusPill}>
      <View
        style={
          status === 'Save failed' || status === 'Sync failed'
            ? styles.statusDotError
            : styles.statusDot
        }
      />
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

function MenuButton() {
  const { openMenu } = useMobileApp();

  return (
    <Pressable
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      onPress={openMenu}
      style={styles.menuButton}
    >
      <Text style={styles.menuButtonText}>☰</Text>
    </Pressable>
  );
}

function formatBookSummary(chapterCount: number, documentCount: number): string {
  return `${chapterCount} chapters · ${documentCount} writing units stored locally`;
}

function getEditorTitlePlaceholder(kind: string): string {
  return kind === 'draft' ? 'Untitled draft' : 'Untitled episode';
}

function formatWordCount(text: string): string {
  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  return `${words} words`;
}

function getDocumentTitle(title: string, chapterId: string): string {
  if (title.length > 0) {
    return title;
  }

  return chapterId === QUICK_DRAFTS_INBOX_CHAPTER_ID ? 'Untitled draft' : 'Untitled episode';
}
