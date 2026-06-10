'use client';

import { CopilotPlugin } from '@platejs/ai/react';
import { stripMarkdown } from '@platejs/markdown';
import { NodeApi, PathApi, TextApi } from 'platejs';
import { getProvider } from '@/components/editor/provider-store';

import { GhostText } from '@/components/ui/ghost-text';

import { MarkdownKit } from './markdown-kit';

export const CopilotKit = [
  ...MarkdownKit,
  CopilotPlugin.configure(({ api }) => ({
    options: {
      completeOptions: {
        api: '/api/ai/copilot',
        body: {
          get provider() {
            return getProvider();
          },
          system: `You are an AI autocomplete engine. Output only the continuation text. No explanations, no meta-text. Never repeat words already in the text. If stuck, return "0".`,
        },
        onError: (error) => {
          console.error('Copilot API error:', error);
        },
        onFinish: (_, completion) => {
          if (completion === '0') return;

          api.copilot.setBlockSuggestion({
            text: stripMarkdown(completion),
          });
        },
      },
      debounceDelay: 150,
      renderGhostText: GhostText,
      // Manual mode: no auto-trigger — user must press Tab to request completion
      autoTriggerQuery: () => false,
      triggerQuery: () => true,
      getPrompt: ({ editor }) => {
        const contextEntry = editor.api.block({ highest: true });
        if (!contextEntry) return '';

        const [block, blockPath] = contextEntry;
        const { selection } = editor;

        // Get text up to cursor position (or full block if no selection)
        let currentText = '';
        if (selection && PathApi.isAncestor(blockPath, selection.anchor.path)) {
          for (const [child, childPath] of NodeApi.children(
            editor,
            blockPath
          )) {
            if (!TextApi.isText(child)) continue;
            if (PathApi.equals(childPath, selection.anchor.path)) {
              currentText += (child.text as string).slice(
                0,
                selection.anchor.offset
              );
              break;
            }
            currentText += child.text as string;
          }
        } else {
          currentText = NodeApi.string(block);
        }

        const promptText = currentText;

        // Only preserve existing trailing space; otherwise send raw
        const lastChar = currentText.slice(-1);
        if (lastChar === ' ') {
          // Already spaced — keep as-is
        }
        // else: no trailing space → raw text (route handles two-prompt)

        return `Continue writing. ${promptText}`;
      },
    },
    shortcuts: {
      accept: {
        keys: 'ctrl+enter',
      },
      reject: {
        keys: 'escape',
      },
      triggerSuggestion: {
        keys: ['tab', 'ctrl+space'],
      },
    },
  })),
];
