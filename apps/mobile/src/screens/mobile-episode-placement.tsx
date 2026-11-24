import type { ChapterMetadata, DocumentMetadata } from '@writer/core';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from './mobile-library-styles';

export function MobileEpisodePlacement({
  chapters,
  document,
  onMove,
}: {
  chapters: ChapterMetadata[];
  document: DocumentMetadata;
  onMove(chapterId: string | null): Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const destinations = chapters.filter(
    ({ archivedAt, bookId }) => !archivedAt && bookId === document.bookId,
  );
  if (destinations.length === 0 && document.chapterId === null) return null;
  const current = destinations.find(({ id }) => id === document.chapterId);

  async function move(chapterId: string | null) {
    if (pending || chapterId === document.chapterId) return;
    setPending(true);
    try {
      const saved = await onMove(chapterId);
      setFailed(!saved);
      if (saved) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.stack}>
      <View style={styles.chapterHeaderRow}>
        <Text style={[styles.cardBody, { flex: 1 }]}>
          {document.chapterId === null ? 'Book level (no chapter)' : current?.title || 'Chapter'}
        </Text>
        <Pressable
          accessibilityLabel={open ? 'Cancel episode move' : 'Move episode'}
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, expanded: open }}
          disabled={pending}
          onPress={() => {
            if (!open) Keyboard.dismiss();
            setOpen(!open);
            setFailed(false);
          }}
          style={styles.inlineButton}
        >
          <Text style={styles.inlineButtonText}>{open ? 'Cancel' : 'Move…'}</Text>
        </Pressable>
      </View>
      {open && (
        <View style={styles.chapterCard}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Move episode to
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.episodeDestinations}>
            {[{ id: null, title: 'Book level (no chapter)' }, ...destinations]
              .filter(({ id }) => id !== document.chapterId)
              .map(({ id, title }) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending}
                  key={id ?? 'book-level'}
                  onPress={() => void move(id)}
                  style={styles.drawerItem}
                >
                  <Text style={styles.documentTitle}>{title || 'Untitled chapter'}</Text>
                </Pressable>
              ))}
          </ScrollView>
          {pending && (
            <Text accessibilityLiveRegion="polite" style={styles.emptyText}>
              Moving…
            </Text>
          )}
          {failed && (
            <Text accessibilityRole="alert" style={styles.emptyText}>
              Could not move this episode. Try again.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
