export function isElementChildOf(element: HTMLElement, parent: HTMLElement) {
  let elementParent = element.parentElement;
  do {
    if (elementParent === parent) return true;
    elementParent = elementParent?.parentElement ?? null;
  } while (elementParent !== null);
  return false;
}
