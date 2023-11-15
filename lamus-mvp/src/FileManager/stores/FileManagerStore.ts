import {
  IReactionDisposer,
  makeAutoObservable,
  observable,
  reaction,
} from "mobx";
import { FileSystemLocation } from "../../stores/FileSystemStore";
import { LoadStatus } from "../LoadStatus";
import { IFileEntryEx } from "../FileList";
import { AppStore } from "../../stores/AppStore";
import { v4 as uuidv4 } from "uuid";

class FileManagerStoreClass {
  leftPane = new FileManagerPane(this);
  rightPane = new FileManagerPane(this);

  displayFocus: "left" | "right" = "left";

  constructor() {
    makeAutoObservable(
      this,
      {},
      {
        autoBind: true,
      }
    );
  }

  dispose() {}
}

export class FileManagerPane {
  location: FileSystemLocation | null = null;
  status: LoadStatus = LoadStatus.LOADING;
  items = observable.array<IFileEntryEx>([]);
  navigateHandler: IReactionDisposer;

  constructor(public store: FileManagerStoreClass) {
    makeAutoObservable(this, {
      store: false,
      navigateHandler: false,
      loadContentsFrom: false,
      refresh: false,
    });

    this.navigateHandler = reaction(
      () => this.location,
      async (location) => this.loadContentsFrom(location)
    );
  }

  async loadContentsFrom(location: FileSystemLocation | null): Promise<void> {
    this.status = LoadStatus.LOADING;
    this.items.clear();
    if (location === null) {
      this.status = LoadStatus.OK;
      return;
    }

    const listFilesRequest = await AppStore.fileSystem.listFiles(
      location.providerId,
      location.path
    );

    if (!listFilesRequest.ok) {
      this.status = LoadStatus.ERROR;
      console.error(listFilesRequest.error);
      return;
    }

    const fileEntries = await listFilesRequest.files;
    fileEntries.forEach((entry) => {
      this.items.push({
        ...entry,
        guid: uuidv4(),
      });
    });

    if (location.path.length > 0) {
      this.items.unshift({
        guid: uuidv4(),
        fileName: "...",
        size: 0,
        dir: true,
        parentDir: true,
      });
    }

    this.status = LoadStatus.OK;
  }

  async refresh() {
    return this.loadContentsFrom(this.location);
  }

  dispose() {
    this.navigateHandler();
  }
}

export const FileManagerStore = new FileManagerStoreClass();
