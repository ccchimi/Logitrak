import React, { createContext, useContext } from 'react';

// Contexto del "flujo raiz" de la app.
// Permite que pantallas que viven ADENTRO del AppNavigator (como el Login)
// le pidan a App.tsx que vuelva a mostrar el Index (la landing), que vive
// AFUERA del navigator. Sin esto, el Login no tiene forma de "volver".
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
