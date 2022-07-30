import { computed, makeAutoObservable } from "mobx";
import {
  FileName,
  IFileEntry,
  Path,
} from "../../stores/fileSystem/IFileSystemProvider";
import { ProviderId } from "../../stores/FileSystemStore";

export class FileDialogStore {
  currentSelection: FileName | null = null;
  pathHistory: Path[] = [];
  pathHistoryCursor: number = -1;
  entryList: IFileEntry[] = [];
  currentProvider: ProviderId | null = null;

  constructor() {
    makeAutoObservable(this, {
      currentPath: computed,
    });
  }

  select(newSelection: FileName) {
    this.currentSelection = newSelection;
  }

  navigate(newPath: Path) {
    this.pathHistoryCursor = this.pathHistory.push(newPath) - 1;
  }

  get currentPath(): Path | null {
    return this.pathHistory[this.pathHistoryCursor] ?? null;
  }

  historyForward(): void {}

  historyBack(): void {}
}
