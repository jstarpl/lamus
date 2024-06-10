import { IFileEntryEx } from "./FileList";

export function fileComparator() {
  return function fileComparatorInner(a: IFileEntryEx, b: IFileEntryEx): number {
    if (a.dir !== b.dir) {
      if (a.dir) return -1;
      return 1;
    }
    if (a.virtual !== b.virtual) {
      if (a.virtual) return -1;
      return 1;
    }
    return a.fileName.localeCompare(b.fileName, undefined, {
      numeric: true,
      caseFirst: "upper",
      sensitivity: "base",
    });
  }
}
