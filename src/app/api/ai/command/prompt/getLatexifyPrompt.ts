import dedent from 'dedent';
import type { SlateEditor } from 'platejs';
import type { ChatMessage } from '@/components/editor/use-chat';

import {
  addSelection,
  buildStructuredPrompt,
  formatTextFromMessages,
  getLastUserInstruction,
  getMarkdownWithSelection,
} from '../utils';
import { commonEditRules } from './common';

export function getLatexifyPrompt(
  editor: SlateEditor,
  messages: ChatMessage[]
) {
  addSelection(editor);
  const selectingMarkdown = getMarkdownWithSelection(editor);
  const endIndex = selectingMarkdown.indexOf('<Selection>');
  const prefilledResponse =
    endIndex === -1 ? '' : selectingMarkdown.slice(0, endIndex);

  return buildStructuredPrompt({
    context: selectingMarkdown,
    examples: [
      dedent`
        <instruction>
        Convert math to LaTeX
        </instruction>

        <context>
        The formula <Selection>x^2 + y^2 = z^2</Selection> is fundamental.
        </context>

        <output>
        $x^2 + y^2 = z^2$
        </output>
      `,
      dedent`
        <instruction>
        Format as LaTeX math
        </instruction>

        <context>
        The integral <Selection>∫ f(x) dx from 0 to 1</Selection> equals 0.5.
        </context>

        <output>
        $\\int_{0}^{1} f(x) \\, dx$
        </output>
      `,
      dedent`
        <instruction>
        LaTeXify this equation
        </instruction>

        <context>
        <Selection>E = mc^2</Selection>
        </context>

        <output>
        $E = mc^2$
        </output>
      `,
      dedent`
        <instruction>
        Format math
        </instruction>

        <context>
        The quadratic formula <Selection>x = (-b ± sqrt(b^2 - 4ac)) / (2a)</Selection> is useful.
        </context>

        <output>
        $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
        </output>
      `,
      dedent`
        <instruction>
        Convert to LaTeX math notation
        </instruction>

        <context>
        <Selection>alpha + beta = gamma / delta</Selection>
        </context>

        <output>
        $\\alpha + \\beta = \\frac{\\gamma}{\\delta}$
        </output>
      `,
      dedent`
        <instruction>
        Make this math LaTeX
        </instruction>

        <context>
        The derivative <Selection>d/dx (x^3) = 3x^2</Selection> is basic.
        </context>

        <output>
        $\\frac{d}{dx}(x^3) = 3x^2$
        </output>
      `,
    ],
    history: formatTextFromMessages(messages),
    instruction: getLastUserInstruction(messages),
    outputFormatting: 'markdown',
    prefilledResponse,
    rules: dedent`
      ${commonEditRules}
      - Convert ALL math-like expressions in the selected text to proper LaTeX notation.
      - Wrap inline math in $...$ and display math in $$...$$.
      - Use proper LaTeX commands: \\frac, \\sqrt, \\sum, \\prod, \\int, \\alpha, \\beta, \\pm, \\infty, etc.
      - Preserve all non-math text exactly as-is.
      - Your response will be concatenated with the prefilledResponse. Ensure smooth continuity.
    `,
    task: dedent`
      The following <context> contains <Selection> tags marking text with math expressions.
      Convert all math to proper LaTeX notation. Output only the LaTeX-formatted replacement.
    `,
  });
}
