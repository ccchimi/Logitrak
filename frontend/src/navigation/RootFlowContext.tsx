import React, { createContext, useContext } from 'react';

type RootFlow = {
  volverAlInicio: () => void;
  puedeVolver: boolean;
};

const RootFlowContext = createContext<RootFlow>({
  volverAlInicio: () => {},
  puedeVolver: false,
});

export function RootFlowProvider({
  value,
  children,
}: {
  value: RootFlow;
  children: React.ReactNode;
}) {
  return (
    <RootFlowContext.Provider value={value}>
      {children}
    </RootFlowContext.Provider>
  );
}

export function useRootFlow(): RootFlow {
  return useContext(RootFlowContext);
}