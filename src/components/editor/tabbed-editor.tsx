'use client';

import type { Value } from 'platejs';
import * as React from 'react';

import { useTabContext } from '@/components/editor/tab-context';

/**
 * Hook that bridges React tab state with the Plate editor.
 * When the active tab changes, it swaps the editor's content.
 * When the editor content changes, it updates the active tab's value.
 */
export function useTabSync(
  editor: any, // PlateEditor — typed loosely to avoid circular deps
  onChangeRef: React.MutableRefObject<boolean>
) {
  const { activeTab, activeTabId, updateTabValue, markDirty } = useTabContext();
  const prevTabIdRef = React.useRef<string | null>(null);

  // Swap editor content when active tab changes
  React.useEffect(() => {
    if (!editor || !activeTab) return;

    // Don't swap if tab didn't actually change
    if (prevTabIdRef.current === activeTabId) return;

    // Save old tab's value before swapping
    if (prevTabIdRef.current) {
      const oldValue = editor.children as Value;
      updateTabValue(prevTabIdRef.current, oldValue);
    }

    // Load new tab's value
    onChangeRef.current = true; // suppress dirty marking during load
    editor.tf.setValue(activeTab.value);
    prevTabIdRef.current = activeTabId;
  }, [activeTabId, editor, activeTab, updateTabValue, onChangeRef]);
}
