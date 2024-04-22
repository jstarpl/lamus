import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export function useFragmentRoute(fragment: string): boolean {
  const location = useLocation()

  return useMemo(() => {
    const elems = location.hash.split('?', 2);
    return fragment === elems[0]
  }, [fragment, location.hash])
}

export function useFragmentParams(): URLSearchParams {
  const location = useLocation();

  return useMemo(() => {
    const elems = location.hash.split("?", 2);
    return new URLSearchParams(elems[1] ?? "");
  }, [location.hash]);
}
