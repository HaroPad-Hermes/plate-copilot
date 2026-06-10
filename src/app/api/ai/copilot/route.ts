import { deepseek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const localProvider = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'not-needed',
});

async function callAI(
  modelInstance: LanguageModel,
  system: string,
  prompt: string,
  tokens: number,
  signal: AbortSignal,
  useLocal: boolean
) {
  return generateText({
    abortSignal: signal,
    maxOutputTokens: tokens,
    model: modelInstance,
    prompt,
    system,
    temperature: 0.2,
    ...(useLocal
      ? {}
      : {
          providerOptions: {
            deepseek: { thinking: { type: 'disabled' as const } },
          },
        }),
  });
}

const WORD_CHECK_SYSTEM =
  'You check if the last word in a text fragment is complete.\n\nRespond with EXACTLY "[Finished]" (with brackets) if the last word is complete.\nRespond with ONLY the missing characters if the last word is incomplete.\n\nCRITICAL: No explanations. No punctuation. No extra text. No spaces. Just the answer.';

export async function POST(req: NextRequest) {
  const {
    apiKey: key,
    model = 'deepseek-v4-flash',
    prompt,
    provider: providerName,
    system,
  } = await req.json();

  const useLocal = providerName === 'local';

  if (!useLocal) {
    const apiKey = key || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DeepSeek API key.' },
        { status: 401 }
      );
    }
  }

  try {
    const modelInstance = useLocal
      ? localProvider('gemma-4-12b-it-qat')
      : deepseek(model);

    const prefix = 'Continue writing. ';
    const text = prompt.startsWith(prefix)
      ? prompt.slice(prefix.length)
      : prompt;

    // Case 1: Trailing space or empty → single call
    if (text.endsWith(' ') || text.length === 0) {
      const result = await callAI(
        modelInstance,
        system,
        prompt,
        40,
        req.signal,
        useLocal
      );
      return NextResponse.json({ text: result.text });
    }

    // Case 2: No trailing space → two-prompt flow
    const lastWord = text.split(/\s/).pop() || text;
    const checkPrompt = `Text: ${text}\nIs the last word complete?`;
    const checkResult = await callAI(
      modelInstance,
      WORD_CHECK_SYSTEM,
      checkPrompt,
      5,
      req.signal,
      useLocal
    );
    const checkResponse = checkResult.text
      .trim()
      .replace(/^Option\s*[AB]:\s*/i, ''); // strip "Option B:" if model uses it
    const isFinished =
      checkResponse.toLowerCase().replace(/[^a-z]/g, '') === 'finished';

    if (isFinished) {
      const continuedPrompt = `Continue writing. ${text} `;
      const sentenceResult = await callAI(
        modelInstance,
        system,
        continuedPrompt,
        40,
        req.signal,
        useLocal
      );
      return NextResponse.json({ text: ' ' + sentenceResult.text });
    }

    const wordCompletion = checkResponse;
    const completedText = text + wordCompletion;
    const continuedPrompt = `Continue writing. ${completedText} `;
    const sentenceResult = await callAI(
      modelInstance,
      system,
      continuedPrompt,
      40,
      req.signal,
      useLocal
    );

    const combined = wordCompletion + ' ' + sentenceResult.text;
    return NextResponse.json({ text: combined });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(null, { status: 408 });
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
