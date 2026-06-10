'use client';

import type { Value } from 'platejs';
import { nanoid } from 'platejs';
import * as React from 'react';

export type Tab = {
  dirty: boolean;
  filePath?: string;
  id: string;
  isSaving?: boolean;
  lastSavedAt?: number; // Date.now() timestamp of last successful save
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

  const openTab = React.useCallback((opts: OpenTabOptions) => {
    const id = nanoid();
    setTabs((prev) => [
      ...prev,
      {
        id,
        name: opts.name,
        value: opts.value,
        dirty: false,
        filePath: opts.filePath,
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
        setSaving,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}
