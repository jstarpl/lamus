/** Inverse of await: execute async function, but don't block the rest */
export function dontWait(
  func: () => Promise<void>,
  catchFunc?: (...args: any[]) => void
) {
  return Promise.resolve(func().catch(catchFunc ?? console.error));
}

export function parseToken(jwt: string) {
  const [encHeader, encPayload, encSignature] = jwt.split(".");
  if (!encSignature) throw new Error("Invalid signature");
  return {
    header: JSON.parse(atob(encHeader)),
    payload: JSON.parse(atob(encPayload)),
  };
}

export function isOrIsAncestorOf(
  ancestor: HTMLElement,
  descendant: HTMLElement
) {
  let n: HTMLElement | null = descendant;
  while (n) {
    if (n === ancestor) {
      return true;
    } else {
      n = n.parentElement;
    }
  }
  return false;
}
