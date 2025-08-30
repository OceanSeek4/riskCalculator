import React, { ReactNode } from 'react';
import { CalculatorFormContext, type CalculatorFormContextValue } from '../../hooks/useCalculatorFormContext';

interface CalculatorFormProviderProps {
  children: ReactNode;
  value: CalculatorFormContextValue;
}

export function CalculatorFormProvider({ children, value }: CalculatorFormProviderProps) {
  return (
    <CalculatorFormContext.Provider value={value}>
      {children}
    </CalculatorFormContext.Provider>
  );
}