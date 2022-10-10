import { IFileEntry } from "../stores/fileSystem/IFileSystemProvider";

export interface IFileEntryEx extends IFileEntry {
  guid: string;
  parentDir?: boolean;
  virtual?: boolean;
}

export function FileList(props: {}) {
  return null;
}
