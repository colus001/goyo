import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import type { MobileWorkspaceState } from '../workspace/mobile-workspace-types';
import { styles } from './mobile-library-styles';
import MobileWritingEditor, { type MobileWritingEditorHandle } from './mobile-writing-editor.dom';

export function MobileEpisodeBody({
  documentId,
  workspace,
}: {
  documentId: string;
  workspace: MobileWorkspaceState;
}) {
  const body = workspace.activeDocumentBody;
  if (body?.documentId !== documentId) {
    return <Text style={styles.emptyText}>Loading writing…</Text>;
  }
  if (body.legacyText !== null) {
    return (
      <ScrollView style={styles.bodyInput}>
        <Text selectable style={styles.emptyText}>
          Older local draft · copy your text to a new episode to edit it.
          {'\n\n'}
          {body.legacyText}
        </Text>
      </ScrollView>
    );
  }
  return (
    <MobileBodyBridge
      documentId={documentId}
      key={documentId}
      stateBase64={body.stateBase64}
      workspace={workspace}
    />
  );
}

function MobileBodyBridge({
  documentId,
  stateBase64,
  workspace: { pendingBodySave, recordDocumentUpdate, registerEditorFlush },
}: {
  documentId: string;
  stateBase64: string;
  workspace: MobileWorkspaceState;
}) {
  const [editorStopped, setEditorStopped] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const { editor, acknowledge, hasMountedEditor } = useEditorFlush(
    documentId,
    editorStopped,
    registerEditorFlush,
  );
  const recordWordCount = useCallback(
    (count: number) => {
      hasMountedEditor.current = true;
      setWordCount(count);
    },
    [hasMountedEditor],
  );

  if (editorStopped) {
    return (
      <Text style={styles.emptyText}>
        Editor stopped. Reopen the episode to load saved writing.
      </Text>
    );
  }

  return (
    <>
      <MobileWritingEditor
        documentId={documentId}
        dom={{
          onContentProcessDidTerminate: () => setEditorStopped(true),
          onRenderProcessGone: () => setEditorStopped(true),
          style: styles.bodyInput,
        }}
        onFlush={acknowledge}
        onUpdate={recordDocumentUpdate}
        onWordCount={recordWordCount}
        ref={editor}
        stateBase64={stateBase64}
      />
      <Text style={styles.editorMetaText}>
        {wordCount} {wordCount === 1 ? 'word' : 'words'} ·{' '}
        {pendingBodySave ? 'Saving…' : 'Saved locally'}
      </Text>
    </>
  );
}

function useEditorFlush(
  documentId: string,
  editorStopped: boolean,
  registerEditorFlush: MobileWorkspaceState['registerEditorFlush'],
) {
  const editor = useRef<MobileWritingEditorHandle>(null);
  const hasMountedEditor = useRef(false);
  const sequence = useRef(0);
  const waiters = useRef(new Map<number, (ready: boolean) => void>());
  const acknowledge = useCallback((id: number, ready: boolean) => {
    waiters.current.get(id)?.(ready);
  }, []);

  useEffect(() => {
    if (editorStopped) return;
    const pending = waiters.current;
    const unregister = registerEditorFlush(documentId, () => {
      const handle = editor.current;
      if (!handle?.flush) return Promise.resolve(!hasMountedEditor.current);
      const id = ++sequence.current;
      return new Promise<boolean>((resolve) => {
        const complete = (ready: boolean) => {
          clearTimeout(timeout);
          pending.delete(id);
          resolve(ready);
        };
        const timeout = setTimeout(() => complete(false), 3000);
        pending.set(id, complete);
        try {
          handle.flush(id);
        } catch {
          complete(false);
        }
      });
    });
    return () => {
      unregister();
      for (const complete of pending.values()) complete(false);
    };
  }, [documentId, editorStopped, registerEditorFlush]);

  return { editor, acknowledge, hasMountedEditor };
}
