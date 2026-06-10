'use client';

import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { useTabContext } from '@/components/editor/tab-context';
import { cn } from '@/lib/utils';

export function EditorTabs() {
  const { tabs, activeTabId, switchTab, closeTab, openTab } = useTabContext();
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const handleNewTab = () => {
    openTab({
      name: 'Untitled',
      value: [{ type: 'p', children: [{ text: '' }] }],
    });
  };

  return (
    <div className="flex items-center border-b bg-neutral-50">
      <div className="flex flex-1 items-center overflow-x-auto" ref={tabsRef}>
        {tabs.map((tab) => (
          <button
            className={cn(
              'group flex shrink-0 items-center gap-1 border-r px-3 py-1.5 text-left text-sm transition-colors',
              tab.id === activeTabId
                ? 'border-b-2 border-b-black bg-white font-medium'
                : 'border-b-2 border-b-transparent text-neutral-500 hover:bg-neutral-100'
            )}
            key={tab.id}
            onClick={() => switchTab(tab.id)}
          >
            <span className="max-w-[160px] truncate">
              {tab.name}
              {tab.isSaving && (
                <Loader2Icon className="ml-1 inline size-3 animate-spin text-blue-500" />
              )}
              {!tab.isSaving && tab.dirty && (
                <span className="ml-1 text-neutral-400">●</span>
              )}
            </span>
            {tabs.length > 1 && (
              <span
                className="ml-1 flex size-4 items-center justify-center rounded-sm opacity-0 hover:bg-neutral-200 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <XIcon className="size-3" />
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        className="flex shrink-0 items-center justify-center border-l px-2 py-1.5 text-neutral-500 hover:bg-neutral-100"
        onClick={handleNewTab}
        title="New tab"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
