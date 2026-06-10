'use client';

import { MarkdownPlugin } from '@platejs/markdown';
import { FolderOpenIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import * as React from 'react';

import { useTabContext } from '@/components/editor/tab-context';
import { FileBrowser } from '@/components/ui/file-browser';
import { ToolbarButton } from './toolbar';

export function OpenToolbarButton() {
  const editor = useEditorRef();
  const { openTab } = useTabContext();
  const [browserOpen, setBrowserOpen] = React.useState(false);

  const handleFileSelect = async (path: string, name: string) => {
    try {
      const res = await fetch(
        `/api/files?action=read&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const nodes = editor
        .getApi(MarkdownPlugin)
        .markdown.deserialize(data.content);
      if (nodes.length > 0) {
        openTab({ name, value: nodes as any, filePath: path });
      }
    } catch (err) {
      console.error('File read error:', err);
    }
  };

  return (
    <>
      <ToolbarButton onClick={() => setBrowserOpen(true)} tooltip="Open File">
        <FolderOpenIcon className="size-4" />
      </ToolbarButton>

      <FileBrowser
        onClose={() => setBrowserOpen(false)}
        onSelect={handleFileSelect}
        open={browserOpen}
      />
    </>
  );
}
