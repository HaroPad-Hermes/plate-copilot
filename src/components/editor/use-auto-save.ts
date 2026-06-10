'use client';

import type { PlateEditor } from 'platejs/react';
import { serializeMd } from '@platejs/markdown';
import * as React from 'react';

import { getFileHandle } from '@/components/editor/file-handles';
import { useTabContext } from '@/components/editor/tab-context';

const DEFAULT_DELAY = 3000; // 3 seconds of inactivity before autosave

export function useAutoSave(editor: PlateEditor, delay = DEFAULT_DELAY) {
  const { activeTab, activeTabId, markClean, setSaving } = useTabContext();
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = React.useRef(false);

  // Refs to avoid stale closures in the timer callback
  const activeTabRef = React.useRef(activeTab);
  activeTabRef.current = activeTab;
  const activeTabIdRef = React.useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const editorRef = React.useRef(editor);
  editorRef.current = editor;

  const doSave = React.useCallback(async () => {
    const tab = activeTabRef.current;
    const tabId = activeTabIdRef.current;
    if (!tab || !tabId || !tab.dirty || savingRef.current) return;

    // Only autosave if we have a known save target
    if (!tab.filePath && !getFileHandle(tabId)) return;

    savingRef.current = true;
    setSaving(tabId, true);
    try {
      const markdown = serializeMd(editorRef.current, {
        value: editorRef.current.children,
      });
      const handle = getFileHandle(tabId);

      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        markClean(tabId);
        return;
      }

      if (tab.filePath) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'write',
            path: tab.filePath,
            content: markdown,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          markClean(tabId);
          return;
        }
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      console.error('Autosave error:', err);
    } finally {
      savingRef.current = false;
      const id = activeTabIdRef.current;
      if (id) setSaving(id, false);
    }
  }, [markClean, setSaving]);

  // Debounce: reset timer on every content change, fire after `delay` ms of inactivity
  React.useEffect(() => {
    // Cancel any pending timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!activeTab?.dirty) return;

    // Only autosave if we have a save target
    if (!activeTab.filePath && !getFileHandle(activeTab.id)) return;

    timerRef.current = setTimeout(() => {
      doSave();
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    activeTab?.dirty,
    activeTab?.id,
    // Re-trigger on content changes while dirty via serialized value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(activeTab?.value),
    delay,
    doSave,
  ]);

  // Cancel pending autosave on manual Ctrl+S (manual save fires separately)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Public API to cancel pending autosave (e.g., on tab close)
  const cancelPending = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { cancelPending };
}
