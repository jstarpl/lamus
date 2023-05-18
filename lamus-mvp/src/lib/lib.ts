import type { MutableRefObject, RefObject } from "react";

export function isElementChildOf(element: HTMLElement, parent: HTMLElement) {
  let elementParent = element.parentElement;
  do {
    if (elementParent === parent) return true;
    elementParent = elementParent?.parentElement ?? null;
  } while (elementParent !== null);
  return false;
}

export function combineRefs<T extends HTMLElement>(
  ...refs: (((el: T | null) => void) | MutableRefObject<T | null> | null)[]
) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) return;
      if (typeof ref === "function") return void ref(node);
      ref.current = node;
    }
  };
}
