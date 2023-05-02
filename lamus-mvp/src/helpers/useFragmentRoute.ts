import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export function useFragmentRoute(fragment: string): boolean {
  const location = useLocation()

  return useMemo(() => fragment === location.hash, [fragment, location.hash])
}
