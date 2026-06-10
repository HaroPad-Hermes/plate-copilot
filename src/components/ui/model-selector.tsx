'use client';

import { CpuIcon, GlobeIcon } from 'lucide-react';
import {
  type ModelProvider,
  useModel,
} from '@/components/editor/model-context';
import { setProvider } from '@/components/editor/provider-store';

import { ToolbarButton } from './toolbar';

export function ModelSelector() {
  const { provider, setProvider: setContextProvider } = useModel();

  const toggle = () => {
    const next: ModelProvider = provider === 'local' ? 'deepseek' : 'local';
    setContextProvider(next);
    setProvider(next);
  };

  return (
    <ToolbarButton
      onClick={toggle}
      tooltip={
        provider === 'local'
          ? 'Local (Gemma 4B) — click for DeepSeek'
          : 'DeepSeek V4 Flash — click for local'
      }
    >
      {provider === 'local' ? (
        <CpuIcon className="size-4 text-green-600" />
      ) : (
        <GlobeIcon className="size-4 text-blue-600" />
      )}
    </ToolbarButton>
  );
}
