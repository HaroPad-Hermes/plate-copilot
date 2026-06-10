'use client';

import type { Value } from 'platejs';
import { nanoid } from 'platejs';
import * as React from 'react';

import { setAiContextStore } from './ai-context-store';

export type Tab = {
  aiContext?: string;
  dirty: boolean;
  filePath?: string;
  id: string;
  isSaving?: boolean;
  lastSavedAt?: number;
  name: string;
  value: Value;
};

export type OpenTabOptions = {
  filePath?: string;
  name: string;
  value: Value;
};

type TabContextValue = {
  activeTab: Tab | null;
  activeTabId: string | null;
  closeTab: (id: string) => void;
  markClean: (id: string) => void;
  markDirty: (id: string) => void;
  openTab: (opts: OpenTabOptions) => string;
  renameTab: (id: string, name: string) => void;
  setAiContext: (id: string, aiContext: string) => void;
  setSaving: (id: string, saving: boolean) => void;
  switchTab: (id: string) => void;
  tabs: Tab[];
  updateTabValue: (id: string, value: Value) => void;
};

export const TabContext = React.createContext<TabContextValue | null>(null);

export function useTabContext() {
  const ctx = React.useContext(TabContext);
  if (!ctx) throw new Error('useTabContext must be used within TabProvider');
  return ctx;
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const emptyTab: Tab = React.useMemo(
    () => ({
      id: nanoid(),
      name: 'Untitled',
      value: [{ type: 'p', children: [{ text: '' }] }],
      dirty: false,
    }),
    []
  );

  const [tabs, setTabs] = React.useState<Tab[]>([emptyTab]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(
    emptyTab.id
  );

  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  // Sync active tab's AI context to the module-level store
  React.useEffect(() => {
    setAiContextStore(activeTab?.aiContext ?? '');
  }, [activeTab?.aiContext]);

  const openTab = React.useCallback((opts: OpenTabOptions) => {
    const id = nanoid();

    // Restore saved AI context from localStorage
    let aiContext: string | undefined;
    if (opts.filePath) {
      const saved = localStorage.getItem(
        `plate-ai-context:${opts.filePath}`
      );
      if (saved) aiContext = saved;
    }

    setTabs((prev) => [
      ...prev,
      {
        id,
        name: opts.name,
        value: opts.value,
        dirty: false,
        filePath: opts.filePath,
        aiContext,
      },
    ]);
    setActiveTabId(id);
    return id;
  }, []);

  const closeTab = React.useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);

        if (id === activeTabId) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        }
        return next;
      });
    },
    [activeTabId]
  );

  const switchTab = React.useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const renameTab = React.useCallback((id: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const markDirty = React.useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dirty: true } : t))
    );
  }, []);

  const markClean = React.useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, dirty: false, lastSavedAt: Date.now() } : t
      )
    );
  }, []);

  const updateTabValue = React.useCallback((id: string, value: Value) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, value } : t)));
  }, []);

  const setSaving = React.useCallback((id: string, saving: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isSaving: saving } : t))
    );
  }, []);

  const setAiContext = React.useCallback(
    (id: string, aiContext: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          // Persist to localStorage keyed by filePath
          if (t.filePath) {
            const key = `plate-ai-context:${t.filePath}`;
            if (aiContext) {
              localStorage.setItem(key, aiContext);
            } else {
              localStorage.removeItem(key);
            }
          }
          return { ...t, aiContext };
        })
      );
    },
    []
  );

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        openTab,
        closeTab,
        switchTab,
        renameTab,
        markDirty,
        markClean,
        updateTabValue,
        setAiContext,
        setSaving,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}
