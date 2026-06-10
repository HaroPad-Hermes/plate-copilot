'use client';

import * as React from 'react';

export type ModelProvider = 'local' | 'deepseek';

type ModelContextValue = {
  provider: ModelProvider;
  setProvider: (p: ModelProvider) => void;
};

const ModelContext = React.createContext<ModelContextValue>({
  provider: 'local',
  setProvider: () => {},
});

export function useModel() {
  return React.useContext(ModelContext);
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = React.useState<ModelProvider>('local');

  return (
    <ModelContext.Provider value={{ provider, setProvider }}>
      {children}
    </ModelContext.Provider>
  );
}
