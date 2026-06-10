'use client';

import * as React from 'react';
import { useModel } from '@/components/editor/model-context';

/**
 * Pings LM Studio every 60s to prevent the model from being unloaded
 * while the editor is open. Only active when local model is selected.
 */
export function KeepAlive() {
  const { provider } = useModel();

  React.useEffect(() => {
    if (provider !== 'local') return;

    const ping = () => {
      fetch('http://127.0.0.1:1234/v1/models').catch(() => {}); // silently ignore errors
    };

    ping(); // immediate
    const interval = setInterval(ping, 60_000);

    return () => clearInterval(interval);
  }, [provider]);

  return null;
}
