import { deepseek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  type LanguageModel,
  Output,
  streamText,
  tool,
  type UIMessageStreamWriter,
} from 'ai';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSlateEditor, nanoid, type SlateEditor } from 'platejs';
import { z } from 'zod';
import { BaseEditorKit } from '@/components/editor/editor-base-kit';
import type { ChatMessage, ToolName } from '@/components/editor/use-chat';
import { markdownJoinerTransform } from '@/lib/markdown-joiner-transform';

import {
  buildEditTableMultiCellPrompt,
  getChooseToolPrompt,
  getCommentPrompt,
  getEditPrompt,
  getGeneratePrompt,
  getLatexifyPrompt,
} from './prompt';

const localProvider = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'not-needed',
});

function getModel(useLocal: boolean, modelId: string): LanguageModel {
  if (useLocal) return localProvider('gemma-4-12b-it-qat');
  return deepseek(modelId);
}

const DEEPSEEK_PROVIDER_OPTS = {
  deepseek: { thinking: { type: 'disabled' as const } },
};

const DEFAULT_MODEL = 'deepseek-v4-flash';

export async function POST(req: NextRequest) {
  const {
    apiKey: key,
    ctx,
    messages: messagesRaw,
    model,
    provider: providerName,
  } = await req.json();

  const { children, selection, toolName: toolNameParam } = ctx;

  const useLocal = providerName === 'local';

  const editor = createSlateEditor({
    plugins: BaseEditorKit,
    selection,
    value: children,
  });

  const apiKey = key || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing DeepSeek API key.' },
      { status: 401 }
    );
  }

  const isSelecting = editor.api.isExpanded();

  // Sensible defaults for generation
  const _GEN_OPTS = {
    maxOutputTokens: 8000,
    temperature: 0.7,
  };

  try {
    const stream = createUIMessageStream<ChatMessage>({
      execute: async ({ writer }) => {
        let toolName = toolNameParam;

        if (toolName) {
          // Tool preset by client — notify frontend of the tool choice
          writer.write({
            data: toolName as any,
            type: 'data-toolName',
          });
        } else {
          const prompt = getChooseToolPrompt({
            isSelecting,
            messages: messagesRaw,
          });

          const enumOptions = isSelecting
            ? ['generate', 'edit', 'comment', 'latexify']
            : ['generate', 'comment'];
          const modelId = model || DEFAULT_MODEL;

          const { output: AIToolName } = await generateText({
            model: getModel(useLocal, modelId),
            output: Output.choice({ options: enumOptions }),
            prompt,
            providerOptions: useLocal ? undefined : DEEPSEEK_PROVIDER_OPTS,
          });

          writer.write({
            data: AIToolName as ToolName,
            type: 'data-toolName',
          });

          toolName = AIToolName;
        }

        const stream = streamText({
          maxOutputTokens: 8000,
          temperature: 0.7,
          experimental_transform: markdownJoinerTransform(),
          model: getModel(useLocal, model || DEFAULT_MODEL),
          // Not used
          prompt: '',
          tools: {
            comment: getCommentTool(editor, {
              messagesRaw,
              model: getModel(useLocal, model || DEFAULT_MODEL),
              writer,
            }),
            table: getTableTool(editor, {
              messagesRaw,
              model: getModel(useLocal, model || DEFAULT_MODEL),
              writer,
            }),
          },
          providerOptions: useLocal ? undefined : DEEPSEEK_PROVIDER_OPTS,
          prepareStep: async (step) => {
            if (toolName === 'comment') {
              return {
                ...step,
                toolChoice: { toolName: 'comment', type: 'tool' },
              };
            }

            if (toolName === 'edit') {
              const [editPrompt, editType] = getEditPrompt(editor, {
                isSelecting,
                messages: messagesRaw,
              });

              // Table editing uses the table tool
              if (editType === 'table') {
                return {
                  ...step,
                  toolChoice: { toolName: 'table', type: 'tool' },
                };
              }

              return {
                ...step,
                activeTools: [],
                model: getModel(useLocal, model || DEFAULT_MODEL),
                messages: [
                  {
                    content: editPrompt,
                    role: 'user',
                  },
                ],
              };
            }

            if (toolName === 'latexify') {
              console.error('[Latexify] prepareStep called');
              const latexifyPrompt = getLatexifyPrompt(editor, messagesRaw);
              console.error(
                '[Latexify] prompt generated, length:',
                latexifyPrompt.length
              );

              return {
                ...step,
                activeTools: [],
                model: getModel(useLocal, model || DEFAULT_MODEL),
                messages: [
                  {
                    content: latexifyPrompt,
                    role: 'user',
                  },
                ],
              };
            }

            if (toolName === 'generate') {
              const generatePrompt = getGeneratePrompt(editor, {
                isSelecting,
                messages: messagesRaw,
              });

              return {
                ...step,
                activeTools: [],
                messages: [
                  {
                    content: generatePrompt,
                    role: 'user',
                  },
                ],
                model: getModel(useLocal, model || DEFAULT_MODEL),
              };
            }
          },
        });

        writer.merge(stream.toUIMessageStream({ sendFinish: false }));
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

const getCommentTool = (
  editor: SlateEditor,
  {
    messagesRaw,
    model,
    writer,
  }: {
    messagesRaw: ChatMessage[];
    model: LanguageModel;
    writer: UIMessageStreamWriter<ChatMessage>;
  }
) =>
  tool({
    description: 'Comment on the content',
    inputSchema: z.object({}),
    strict: true,
    execute: async () => {
      const commentSchema = z.object({
        blockId: z
          .string()
          .describe(
            'The id of the starting block. If the comment spans multiple blocks, use the id of the first block.'
          ),
        comment: z
          .string()
          .describe('A brief comment or explanation for this fragment.'),
        content: z
          .string()
          .describe(
            String.raw`The original document fragment to be commented on.It can be the entire block, a small part within a block, or span multiple blocks. If spanning multiple blocks, separate them with two \n\n.`
          ),
      });

      const { partialOutputStream } = streamText({
        model,
        output: Output.array({ element: commentSchema }),
        prompt: getCommentPrompt(editor, {
          messages: messagesRaw,
        }),
      });

      let lastLength = 0;

      for await (const partialArray of partialOutputStream) {
        for (let i = lastLength; i < partialArray.length; i++) {
          const comment = partialArray[i];
          const commentDataId = nanoid();

          writer.write({
            id: commentDataId,
            data: {
              comment,
              status: 'streaming',
            },
            type: 'data-comment',
          });
        }

        lastLength = partialArray.length;
      }

      writer.write({
        id: nanoid(),
        data: {
          comment: null,
          status: 'finished',
        },
        type: 'data-comment',
      });
    },
  });

const getTableTool = (
  editor: SlateEditor,
  {
    messagesRaw,
    model,
    writer,
  }: {
    messagesRaw: ChatMessage[];
    model: LanguageModel;
    writer: UIMessageStreamWriter<ChatMessage>;
  }
) =>
  tool({
    description: 'Edit table cells',
    inputSchema: z.object({}),
    strict: true,
    execute: async () => {
      const cellUpdateSchema = z.object({
        content: z
          .string()
          .describe(
            String.raw`The new content for the cell. Can contain multiple paragraphs separated by \n\n.`
          ),
        id: z.string().describe('The id of the table cell to update.'),
      });

      const { partialOutputStream } = streamText({
        model,
        output: Output.array({ element: cellUpdateSchema }),
        prompt: buildEditTableMultiCellPrompt(editor, messagesRaw),
      });

      let lastLength = 0;

      for await (const partialArray of partialOutputStream) {
        for (let i = lastLength; i < partialArray.length; i++) {
          const cellUpdate = partialArray[i];

          writer.write({
            id: nanoid(),
            data: {
              cellUpdate,
              status: 'streaming',
            },
            type: 'data-table',
          });
        }

        lastLength = partialArray.length;
      }

      writer.write({
        id: nanoid(),
        data: {
          cellUpdate: null,
          status: 'finished',
        },
        type: 'data-table',
      });
    },
  });
