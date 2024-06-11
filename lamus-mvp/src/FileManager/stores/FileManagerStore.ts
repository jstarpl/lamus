import {
  action,
  makeAutoObservable,
} from "mobx";
import { ProviderId } from "src/stores/FileSystemStore";
import { Path } from "src/stores/fileSystem/IFileSystemProvider";
import { FileManagerPaneStore } from "./FileManagerPaneStore";

export class FileManagerStoreClass {
  leftPane = new FileManagerPaneStore(this);
  rightPane = new FileManagerPaneStore(this);

  displayFocus: DisplayFocus = "left";

  constructor() {
    makeAutoObservable(
      this,
      {
        setDisplayFocus: action,
      },
      {
        autoBind: true,
      }
    );
  }

  setDisplayFocus(focus: DisplayFocus) {
    this.displayFocus = focus;
  }

  async createCopyOperationSet(): Promise<BatchFileOperation[]> {
    return []
  }

  async executeOperation(op: BatchFileOperation): Promise<void> {

  }

  dispose() {}
}

type DisplayFocus = "left" | "right";

export const FileManagerStore = new FileManagerStoreClass();

export type BatchFileOperation = {
  op: 'copyFile'
  srcProviderId: ProviderId
  srcPath: Path
  providerId: ProviderId
  path: Path
  fileName: string
} | {
  op: 'mkDir'
  providerId: ProviderId
  path: Path
  dirName: string
} | {
  op: 'delFile'
  providerId: ProviderId
  path: Path
  fileName: string
} | {
  op: 'rmDir'
  providerId: ProviderId
  path: Path
  fileName: string
}
