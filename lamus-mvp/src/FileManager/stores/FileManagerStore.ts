import {
  action,
  flow,
  makeAutoObservable,
} from "mobx";
import { CancellablePromise } from "mobx/dist/internal";
import { AppStore } from "src/stores/AppStore";
import { ProviderId } from "src/stores/FileSystemStore";
import { IFileEntry, IFileSystemProvider, IListResult, Path } from "src/stores/fileSystem/IFileSystemProvider";
import { copyFile } from "src/stores/fileSystem/utils/operations";
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
        swapDisplayFocus: action,
      },
      {
        autoBind: true,
      }
    );
  }

  swapDisplayFocus() {
    if (this.displayFocus === "left") {
      this.setDisplayFocus("right");
    } else {
      this.setDisplayFocus("left");
    }
  }

  setDisplayFocus(focus: DisplayFocus) {
    this.displayFocus = focus;
  }

  createCopyOperationSet: (srcProviderId: string, srcPath: Path, srcEntries: IFileEntry[], providerId: string, path: Path) => CancellablePromise<IBatchFileOperation[]> = flow(function* (this: FileManagerStoreClass, srcProviderId: string, srcPath: Path, srcEntries: IFileEntry[], providerId: string, path: Path) {
    let result: IBatchFileOperation[] = []

    for (const entry of srcEntries) {
      if (entry.dir) {
        const provider = AppStore.fileSystem.providers.get(srcProviderId)
        if (!provider) throw new Error(`Could not find provider "${srcProviderId}"`)
        result.push({
          op: 'mkDir',
          providerId,
          path,
          dirName: entry.fileName
        })
        const newPath = [...path, entry.fileName]
        const newSrcPath = [...srcPath, entry.fileName]
        const newSrcEntriesRes: IListResult = yield provider.list(newSrcPath)
        if (!newSrcEntriesRes.ok) throw new Error(`Could not list contents of path: ${newSrcPath}`)
        result = result.concat(yield this.createCopyOperationSet(srcProviderId, newSrcPath, yield newSrcEntriesRes.files, providerId, newPath))
      } else {
        result.push({
          op: 'copyFile',
          fileName: entry.fileName,
          srcProviderId,
          srcPath,
          path,
          providerId,
        })
      }
    }

    return result
  })

  executeOperation: (op: IBatchFileOperation) => CancellablePromise<void> = flow(function* (this: FileManagerStoreClass, op: IBatchFileOperation) {
    const provider = AppStore.fileSystem.providers.get(op.providerId)
    if (!provider) throw new Error(`Could not find file system provider: "${op.providerId}"`)
    switch (op.op) {
      case 'copyFile':
        return yield this.executeCopyOperation(provider, op)
      case 'delFile':
        return yield this.executeDelOperation(provider, op)
      case 'mkDir':
        return yield this.executeMkDirOperation(provider, op)
      case 'rmDir':
        return yield this.executeRmDirOperation(provider, op)
    }
  })

  private async executeRmDirOperation(provider: IFileSystemProvider, op: RmDirOperation): Promise<void> {
    const res = await provider.unlink(op.path, op.dirName)
    if (!res.ok) throw new Error(`Could not remove directory: "${op.dirName}"`)
    return
  }

  private async executeCopyOperation(provider: IFileSystemProvider, op: CopyFileOperation): Promise<void> {
    const srcProvider = AppStore.fileSystem.providers.get(op.srcProviderId)
    if (!srcProvider) throw new Error(`Could not find file system provider: "${op.srcProviderId}"`)
    return copyFile(srcProvider, op.srcPath, op.fileName, provider, op.path)
  }

  private async executeDelOperation(provider: IFileSystemProvider, op: DelFileOperation): Promise<void> {
    const res = await provider.unlink(op.path, op.fileName)
    if (!res.ok) throw new Error(`Could not delete file: "${op.fileName}"`)
    return
  }

  private async executeMkDirOperation(provider: IFileSystemProvider, op: MkDirOperation): Promise<void> {
    const res = await provider.mkdir(op.path, op.dirName)
    if (!res.ok) throw new Error(`Could not create directory: "${op.dirName}"`)
    return
  }

  dispose() {}
}

type DisplayFocus = "left" | "right";

export const FileManagerStore = new FileManagerStoreClass();

type CopyFileOperation = {
  op: 'copyFile'
  srcProviderId: ProviderId
  srcPath: Path
  providerId: ProviderId
  path: Path
  fileName: string
}
type MkDirOperation = {
  op: 'mkDir'
  providerId: ProviderId
  path: Path
  dirName: string
}
type DelFileOperation = {
  op: 'delFile'
  providerId: ProviderId
  path: Path
  fileName: string
}
type RmDirOperation = {
  op: 'rmDir'
  providerId: ProviderId
  path: Path
  dirName: string
}

export type IBatchFileOperation = CopyFileOperation | MkDirOperation | DelFileOperation | RmDirOperation
