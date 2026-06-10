'use client';

import { MarkdownPlugin } from '@platejs/markdown';
import * as React from 'react';

import { useTabContext } from '@/components/editor/tab-context';

export function AutoOpenFile({ path }: { path?: string }) {
  const { openTab } = useTabContext();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (!path || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/files?action=read&path=${encodeURIComponent(path)}`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const { createSlateEditor } = await import('platejs');
        const editor = createSlateEditor({ plugins: [MarkdownPlugin] });
        const nodes = editor
          .getApi(MarkdownPlugin)
          .markdown.deserialize(data.content);

        if (nodes.length > 0) {
          openTab({ name: data.name, value: nodes as any, filePath: path });
        }
      } catch (err) {
        console.error('Auto-open error:', err);
      }
    })();
  }, [path]);

  return null;
}
