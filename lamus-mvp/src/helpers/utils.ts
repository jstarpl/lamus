export function dontWait(
  func: () => Promise<void>,
  catchFunc?: (...args: any[]) => void
) {
  func().catch(catchFunc ?? console.error);
}
