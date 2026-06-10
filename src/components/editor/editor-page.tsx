'use client';

import { Toaster } from 'sonner';
import { AutoOpenFile } from '@/components/editor/auto-open-file';
import { KeepAlive } from '@/components/editor/keep-alive';
import { ModelProvider } from '@/components/editor/model-context';
import { PlateEditor } from '@/components/editor/plate-editor';
import { TabProvider } from '@/components/editor/tab-context';
import { EditorTabs } from '@/components/ui/editor-tabs';

export function EditorPage({ initialFile }: { initialFile?: string }) {
  return (
    <ModelProvider>
      <TabProvider>
        <KeepAlive />
        <AutoOpenFile path={initialFile} />
        <div className="flex h-screen w-full flex-col">
          <EditorTabs />
          <div className="flex-1 overflow-hidden">
            <PlateEditor />
          </div>
        </div>
        <Toaster />
      </TabProvider>
    </ModelProvider>
  );
}
