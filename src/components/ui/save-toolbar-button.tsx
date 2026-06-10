'use client';

import { serializeMd } from '@platejs/markdown';
import { SaveIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { getFileHandle } from '@/components/editor/file-handles';
import { useTabContext } from '@/components/editor/tab-context';

import { ToolbarButton } from './toolbar';

export function SaveToolbarButton() {
  const editor = useEditorRef();
  const { activeTab, activeTabId, markClean } = useTabContext();

  const handleSave = async () => {
    if (!activeTab || !activeTabId) return;

    const markdown = serializeMd(editor, { value: editor.children });

    const handle = getFileHandle(activeTabId);
    if (handle) {
      try {
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        markClean(activeTabId);
        return;
      } catch (err) {
        console.error('Save error:', err);
      }
    }

    // Try API write if we have a filePath
    if (activeTab.filePath) {
      try {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'write',
            path: activeTab.filePath,
            content: markdown,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          markClean(activeTabId);
          return;
        }
        throw new Error(data.error);
      } catch (err) {
        console.error('API save error:', err);
      }
    }

    // Fall back to download
  };

  function _downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
    markClean(activeTabId!);
  }

  return (
    <ToolbarButton onClick={handleSave} tooltip="Save (Ctrl+S)">
      <SaveIcon className="size-4" />
    </ToolbarButton>
  );
}
