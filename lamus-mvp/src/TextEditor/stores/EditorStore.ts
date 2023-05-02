import { Document } from "@editorjs/editorjs";
import { uniqueId } from "lodash";
import { makeAutoObservable } from "mobx";
import { dontWait } from "../../helpers/util";
import { AppStore } from "../../stores/AppStore";
import { FileName, Path } from "../../stores/fileSystem/IFileSystemProvider";
import { FileHandle, ProviderId } from "../../stores/FileSystemStore";
import { fromMarkdown, toMarkdown } from "../markdown";

const ACTIVE_DOCUMENT_KEY = "textEditor:activeDocument";

const AUTOSAVE_DEBOUNCE = 5000;

class EditorStoreClass {
  document: Document | null = null;
  file: FileHandle | null = null;

  private autosaveTimeout: NodeJS.Timeout | undefined = undefined;

  constructor() {
    makeAutoObservable(this, {
      autosave: false,
    });

    this.document = JSON.parse(
      sessionStorage.getItem(ACTIVE_DOCUMENT_KEY) ||
        JSON.stringify({
          blocks: [],
        })
    );
  }

  setDocument(newDocument: Document) {
    this.document = newDocument;
    sessionStorage.setItem(ACTIVE_DOCUMENT_KEY, JSON.stringify(newDocument));
    this.autosave();
  }

  autosave() {
    clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = setTimeout(() => {
      dontWait(this.save.bind(this));
    }, AUTOSAVE_DEBOUNCE);
  }

  get saved(): boolean {
    if (
      this.file === null &&
      (this.document === null || this.document?.blocks.length === 0)
    ) {
      return true;
    }
    return (
      this.document !== null &&
      this.document.blocks.length > 0 &&
      (this.document.blocks[0].type !== "paragraph" ||
        this.document.blocks[0].data.text !== "") &&
      this.file !== null
    );
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
    this.document = {
      time: Date.now(),
      blocks: fromMarkdown(text),
      version: result.meta ?? uniqueId(),
    };

    return true;
  }

  private async getBlob(): Promise<Blob> {
    if (!this.document) throw new Error("Document not created");

    return new Blob([toMarkdown(this.document.blocks)], {
      type: "text/markdown",
    });
  }

  private setFile(file: FileHandle | null): void {
    this.file = file;
  }
}

export const EditorStore = new EditorStoreClass();
