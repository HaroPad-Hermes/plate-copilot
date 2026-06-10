import { deepseek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const localProvider = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'not-needed',
});

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

    const result = await generateText({
      abortSignal: req.signal,
      maxOutputTokens: 40,
      model: modelInstance,
      prompt,
      system,
      temperature: 0.2,
      ...(useLocal
        ? {}
        : {
            providerOptions: {
              deepseek: { thinking: { type: 'disabled' } },
            },
          }),
    });

    return NextResponse.json({ text: result.text });
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
