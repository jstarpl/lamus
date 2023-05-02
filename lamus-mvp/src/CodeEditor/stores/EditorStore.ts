import { autorun, makeAutoObservable, runInAction } from "mobx";
import { dontWait } from "../../helpers/util";
import { AppStore } from "../../stores/AppStore";
import { FileName, Path } from "../../stores/fileSystem/IFileSystemProvider";
import { FileHandle, ProviderId } from "../../stores/FileSystemStore";
import { VMRunState, VMStoreClass } from "./VMStore";

const ACTIVE_DOCUMENT_KEY = "codeEditor:activeDocument";

const AUTOSAVE_DEBOUNCE = 5000;

type Text = string;

class EditorStoreClass {
  document: Text | null = null;
  file: FileHandle | null = null;

  displayFocus: "editor" | "output" = "editor";

  vm: VMStoreClass | null = null;

  _autosaveTimeout: NodeJS.Timeout | undefined = undefined;

  constructor() {
    makeAutoObservable(
      this,
      {
        autosave: false,
        _autosaveTimeout: false,
        document: false,
        file: false,
      },
      {
        autoBind: true,
      }
    );

    this.document = JSON.parse(
      localStorage.getItem(ACTIVE_DOCUMENT_KEY) || JSON.stringify("")
    );
  }

  setDocument(newDocument: Text) {
    if (newDocument === this.document) return;
    this.document = newDocument;
    localStorage.setItem(ACTIVE_DOCUMENT_KEY, JSON.stringify(newDocument));
    this.autosave();
  }

  mountVirtualMachine(
    consoleParent: HTMLElement,
    soundEffects: HTMLAudioElement[]
  ) {
    this.vm = new VMStoreClass(
      consoleParent,
      soundEffects,
      this.file?.providerId ?? "dropbox"
    );

    const dispose = autorun(() => {
      if (this.vm?.runState === VMRunState.RUNNING) {
        this.setDisplayFocus("output");
      }
    });

    return () => {
      this.vm?.dispose();
      dispose();
    };
  }

  autosave() {
    clearTimeout(this._autosaveTimeout);
    this._autosaveTimeout = setTimeout(() => {
      dontWait(this.save.bind(this));
    }, AUTOSAVE_DEBOUNCE);
  }

  async checkIfCanSave(
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<{ ok: boolean; meta?: any }> {
    try {
      const result = await AppStore.fileSystem.access(
        providerId,
        path,
        fileName
      );
      if (!result.ok) throw new Error("Could not access storage");
      if (result.found) return { ok: false, meta: result.meta };
      return { ok: true, meta: result.meta };
    } catch (e) {
      return { ok: false };
    }
  }

  async saveAs(
    providerId: ProviderId,
    path: Path,
    fileName: FileName,
    meta?: any
  ): Promise<boolean> {
    if (this.document === null) return false;

    const result = await AppStore.fileSystem.write(
      providerId,
      path,
      fileName,
      this.getBlob(),
      meta
    );
    if (!result.ok) {
      console.error(result);
      throw new Error("Could not save file");
    }
    this.setFile({
      providerId,
      path: path.slice(),
      fileName: result.fileName || fileName,
      meta: result.meta ?? undefined,
    });
    return true;
  }

  async save(): Promise<void> {
    if (this.document === null) return;
    if (this.file === null) return;
    if (!AppStore.fileSystem.providers.get(this.file.providerId)) return;

    const result = await AppStore.fileSystem.write(
      this.file.providerId,
      this.file.path,
      this.file.fileName,
      this.getBlob(),
      this.file.meta ?? undefined
    );

    if (!result.ok) {
      console.error(result);
      throw new Error("Could not save file");
    }

    this.file.fileName = result.fileName || this.file.fileName;
    this.file.meta = result.meta ?? undefined;
  }

  async open(file: FileHandle): Promise<boolean> {
    if (!AppStore.fileSystem.providers.get(file.providerId)) return false;

    const result = await AppStore.fileSystem.read(
      file.providerId,
      file.path,
      file.fileName
    );

    if (!result.ok) {
      console.error(result.error);
      return false;
    }

    const text = await (await result.data).text();

    this.setFile({
      providerId: file.providerId,
      path: file.path.slice(),
      fileName: file.fileName,
      meta: result.meta ?? undefined,
    });

    this.document = text;

    return true;
  }

  private async getBlob(): Promise<Blob> {
    return new Blob([this.document ?? ""], {
      type: "text/plain",
    });
  }

  private setFile(file: FileHandle | null): void {
    this.file = file;
  }

  setDisplayFocus(focus: "editor" | "output") {
    runInAction(() => {
      this.displayFocus = focus;
    });
  }
}

export const EditorStore = new EditorStoreClass();
