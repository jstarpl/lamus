import {
  IReactionDisposer,
  action,
  flow,
  makeAutoObservable,
  observable,
  reaction,
} from "mobx";
import { FileSystemLocation } from "../../stores/FileSystemStore";
import { LoadStatus } from "../LoadStatus";
import { IFileEntryEx } from "../FileList";
import { AppStore } from "../../stores/AppStore";
import { v4 as uuidv4 } from "uuid";
import {
  IFileEntry,
  IListResult,
} from "../../stores/fileSystem/IFileSystemProvider";

class FileManagerStoreClass {
  leftPane = new FileManagerPane(this);
  rightPane = new FileManagerPane(this);

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

  dispose() {}
}

type DisplayFocus = "left" | "right";

export class FileManagerPane {
  location: FileSystemLocation | null = null;
  status: LoadStatus = LoadStatus.LOADING;
  items = observable.array<IFileEntryEx>([]);
  navigateHandler: IReactionDisposer;
  isChangingStorage: boolean = false;

  constructor(public store: FileManagerStoreClass) {
    makeAutoObservable(this, {
      store: false,
      navigateHandler: false,
      loadContentsFrom: false,
      refresh: false,
      isChangingStorage: observable,
    });

    this.navigateHandler = reaction(
      () => this.location,
      async (location) => this.loadContentsFrom(location)
    );
  }

  loadContentsFrom = flow(function* (
    this: FileManagerPane,
    location: FileSystemLocation | null
  ) {
    this.status = LoadStatus.LOADING;
    this.items.clear();
    if (location === null) {
      this.status = LoadStatus.OK;
      return;
    }

    const listFilesRequest: IListResult = yield AppStore.fileSystem.listFiles(
      location.providerId,
      location.path
    );

    if (!listFilesRequest.ok) {
      this.status = LoadStatus.ERROR;
      console.error(listFilesRequest.error);
      return;
    }

    const fileEntries: IFileEntry[] = yield listFilesRequest.files;
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
  });

  refresh = flow(function* (this: FileManagerPane) {
    return this.loadContentsFrom(this.location);
  });

  dispose() {
    this.navigateHandler();
  }

  setLocation = action((location: FileSystemLocation) => {
    this.location = location;
  });

  setChangingStorage = action((value: boolean) => {
    this.isChangingStorage = value;
  });
}

export const FileManagerStore = new FileManagerStoreClass();
