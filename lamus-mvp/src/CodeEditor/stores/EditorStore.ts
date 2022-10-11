import { makeAutoObservable } from "mobx";
import { dontWait } from "../../helpers/util";
import { AppStore } from "../../stores/AppStore";
import { FileHandle } from "../../stores/FileSystemStore";

const ACTIVE_DOCUMENT_KEY = "codeEditor:activeDocument";

const AUTOSAVE_DEBOUNCE = 5000;

type Text = string;

class EditorStoreClass {
  document: Text | null = null;
  file: FileHandle | null = {
    fileName: "temp.md",
    path: [],
    providerId: "dropbox",
  };
  meta: any = null;
  isSaveFileDialogOpen: boolean = false;
  isOpenFileDialogOpen: boolean = false;

  private autosaveTimeout: NodeJS.Timeout | undefined = undefined;

  constructor() {
    makeAutoObservable(this, {
      autosave: false,
    });

    this.document = JSON.parse(
      localStorage.getItem(ACTIVE_DOCUMENT_KEY) || JSON.stringify("")
    );
  }

  setDocument(newDocument: Text) {
    this.document = newDocument;
    localStorage.setItem(ACTIVE_DOCUMENT_KEY, JSON.stringify(newDocument));
    this.autosave();
  }

  autosave() {
    clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = setTimeout(() => {
      dontWait(this.save.bind(this));
    }, AUTOSAVE_DEBOUNCE);
  }

  async save(): Promise<void> {
    if (this.document === null) return;
    if (this.file === null) return;
    if (!AppStore.fileSystem.providers.get(this.file.providerId)) return;

    // const result = await AppStore.fileSystem.write(
    //   this.file.providerId,
    //   this.file.path,
    //   this.file.fileName,
    //   Promise.resolve(
    //     new Blob([toMarkdown(this.document.blocks)], {
    //       type: "text/markdown",
    //     })
    //   ),
    //   this.file.meta ?? undefined
    // );

    // if (!result.ok) {
    //   console.error(result);
    //   return;
    // }

    // this.file.fileName = result.fileName || this.file.fileName;
    // this.file.meta = result.meta || null;
  }

  setOpenSaveFileDialog(open: boolean) {
    this.isSaveFileDialogOpen = open;
  }

  setOpenOpenFileDialog(open: boolean) {
    this.isOpenFileDialogOpen = open;
  }
}

export const EditorStore = new EditorStoreClass();
