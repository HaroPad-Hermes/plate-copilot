'use client';

import { BrainIcon } from 'lucide-react';
import * as React from 'react';

import { useTabContext } from '@/components/editor/tab-context';

import { ToolbarButton } from './toolbar';

export function AiContextButton() {
  const { activeTab, activeTabId, setAiContext } = useTabContext();
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSave = () => {
    if (!activeTabId) return;
    setAiContext(activeTabId, inputRef.current?.value ?? '');
    setOpen(false);
  };

  return (
    <>
      <ToolbarButton
        onClick={() => setOpen((v) => !v)}
        tooltip={
          activeTab?.aiContext
            ? `AI context: ${activeTab.aiContext}`
            : 'Set AI context'
        }
      >
        <BrainIcon className="size-4" />
        {activeTab?.aiContext && (
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
        )}
      </ToolbarButton>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-white p-3 shadow-lg">
          <input
            ref={inputRef}
            className="w-full rounded border px-2 py-1 text-sm outline-none focus:border-blue-400"
            defaultValue={activeTab?.aiContext ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder='e.g. "Writing a formal report about climate change"'
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
              onClick={handleSave}
            >
              Set
            </button>
          </div>
        </div>
      )}
    </>
  );
}
