'use client';

import { importDocx } from '@platejs/docx-io';
import { MarkdownPlugin } from '@platejs/markdown';
import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import { ArrowUpToLineIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { getEditorDOMFromHtmlString } from 'platejs/static';
import * as React from 'react';
import { setFileHandle } from '@/components/editor/file-handles';
import { useTabContext } from '@/components/editor/tab-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileBrowser } from '@/components/ui/file-browser';

import { ToolbarButton } from './toolbar';

type ImportType = 'html' | 'markdown';

export function ImportToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const { openTab } = useTabContext();
  const [open, setOpen] = React.useState(false);
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

  const getFileNodes = (text: string, type: ImportType) => {
    if (type === 'html') {
      const editorNode = getEditorDOMFromHtmlString(text);
      return editor.api.html.deserialize({ element: editorNode });
    }
    if (type === 'markdown') {
      return editor.getApi(MarkdownPlugin).markdown.deserialize(text);
    }
    return [];
  };

  const importFile = async (
    accept: Record<string, string[]>,
    type: ImportType,
    _supportsFSA: boolean
  ) => {
    try {
      let name = 'Untitled';
      let text = '';
      let handle: FileSystemFileHandle | undefined;

      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ accept }],
          mode: 'readwrite',
        });
        handle = fileHandle;
        const file = await fileHandle.getFile();
        name = file.name;
        text = await file.text();
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        const exts = Object.values(accept)[0];
        input.accept = exts.join(',');
        const file = await new Promise<File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;
        name = file.name;
        text = await file.text();
      }

      const nodes = getFileNodes(text, type);
      if (nodes.length > 0) {
        if (handle) {
          const tabId = openTab({ name, value: nodes as any, filePath: name });
          setFileHandle(tabId, handle);
        } else {
          // Classic input doesn't give a directory path — no filePath tracked.
          // Use "Browse Files..." in the import menu for save-back support.
          openTab({ name, value: nodes as any });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // user cancelled
      console.error('Import error:', err);
    }
  };

  const importDocxFile = async (_supportsFSA: boolean) => {
    try {
      let name = 'Untitled';
      let buffer: ArrayBuffer;
      let handle: FileSystemFileHandle | undefined;

      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              accept: {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                  ['.docx'],
              },
            },
          ],
          mode: 'readwrite',
        });
        handle = fileHandle;
        const file = await fileHandle.getFile();
        name = file.name;
        buffer = await file.arrayBuffer();
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.docx';
        const file = await new Promise<File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;
        name = file.name;
        buffer = await file.arrayBuffer();
      }

      const result = await importDocx(editor, buffer);
      if (result.nodes && result.nodes.length > 0) {
        if (handle) {
          const tabId = openTab({
            name,
            value: result.nodes as any,
            filePath: name,
          });
          setFileHandle(tabId, handle);
        } else {
          openTab({ name, value: result.nodes as any });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Import DOCX error:', err);
    }
  };

  const supportsFSA =
    typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={setOpen} open={open} {...props}>
        <DropdownMenuTrigger asChild>
          <ToolbarButton isDropdown pressed={open} tooltip="Import">
            <ArrowUpToLineIcon className="size-4" />
          </ToolbarButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() =>
                importFile(
                  { 'text/html': ['.html', '.htm'] },
                  'html',
                  supportsFSA
                )
              }
            >
              Import from HTML
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                importFile(
                  { 'text/markdown': ['.md', '.mdx'] },
                  'markdown',
                  supportsFSA
                )
              }
            >
              Import from Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => importDocxFile(supportsFSA)}>
              Import from Word
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setBrowserOpen(true)}>
              Browse Files...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FileBrowser
        onClose={() => setBrowserOpen(false)}
        onSelect={handleFileSelect}
        open={browserOpen}
      />
    </>
  );
}
