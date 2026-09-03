import { createContext, useContext } from "react";

export const ShadowRootContext = createContext<HTMLElement | null>(null);

export function useShadowContainer(): HTMLElement | null {
  return useContext(ShadowRootContext);
}
