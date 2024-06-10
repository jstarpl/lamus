import {
  action,
  flow,
  makeAutoObservable,
  observable
} from "mobx";
import { v4 as uuidv4 } from "uuid";
import { AppStore } from "../../stores/AppStore";
import { FileSystemLocation } from "../../stores/FileSystemStore";
import {
  FileName,
  IFileEntry,
  IListResult,
} from "../../stores/fileSystem/IFileSystemProvider";
import { IFileEntryEx } from "../FileList";
import { LoadStatus } from "../LoadStatus";

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
  selectedFiles = observable.set<FileName>([]);
  isChangingStorage: boolean = false;

  constructor(public store: FileManagerStoreClass) {
    makeAutoObservable(this, {
      store: false,
      loadContentsFrom: false,
      refresh: false,
      isChangingStorage: observable,
    });
  }

  loadContentsFrom = flow(function* (
    this: FileManagerPane,
    location: FileSystemLocation | null
  ) {
    this.status = LoadStatus.LOADING;
    this.items.clear();
    this.selectedFiles.clear();
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
    fileEntries.sort().forEach((entry) => {
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
    
  }

  setLocation = flow(function* (this: FileManagerPane, location: FileSystemLocation) {
    this.location = location;
    yield this.loadContentsFrom(location);
  });

  setChangingStorage = action((value: boolean) => {
    this.isChangingStorage = value;
  });

  setSelectedFiles = action((selectedItems: FileName[]) => {
    this.selectedFiles.replace(selectedItems)
  })

  makeBusy = action(() => {
    this.status = LoadStatus.LOADING
  })
}

export const FileManagerStore = new FileManagerStoreClass();
