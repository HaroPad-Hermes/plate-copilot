'use client';

import { BrainIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { useTabContext } from '@/components/editor/tab-context';

import { ToolbarButton } from './toolbar';

export function AiContextButton() {
  const { activeTab, activeTabId, setAiContext } = useTabContext();
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>(
    {}
  );

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        left: Math.min(rect.left, window.innerWidth - 336),
        top: rect.bottom + 4,
        zIndex: 9999,
      });
    }
  }, [open]);

  const handleSave = () => {
    if (!activeTabId) return;
    setAiContext(activeTabId, inputRef.current?.value ?? '');
    setOpen(false);
  };

  return (
    <>
      <div ref={buttonRef} className="relative inline-flex">
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
      </div>

      {open &&
        createPortal(
          <div
            className="w-80 rounded-md border bg-white p-3 shadow-lg"
            style={popoverStyle}
          >
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
          </div>,
          document.body
        )}
    </>
  );
}
