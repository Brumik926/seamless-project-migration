import { createContext, useContext } from "react";

export const BalanceVisibilityContext = createContext(false);

export function useHideBalances(): boolean {
  return useContext(BalanceVisibilityContext);
}
