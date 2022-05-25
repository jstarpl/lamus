import {
  IFileEntry,
  IFileSystemProvider,
  IListResult,
  IReadResult,
  IWriteResult,
  Path,
} from "../IFileSystemProvider";
import { Dropbox, DropboxAuth, files } from "dropbox";
import { CustomDropboxAuth } from "./CustomDropboxAuth";

const DROPBOX_APP_FOLDER = "/Lamus";

type DropboxReference =
  | files.FileMetadataReference
  | files.FolderMetadataReference
  | files.DeletedMetadataReference;

export class DropboxProvider implements IFileSystemProvider {
  private dropbox: Dropbox | null = null;
  private auth: DropboxAuth | null = null;

  isCloud: boolean = true;
  name: string = "Dropbox";

  async init(): Promise<void> {
    this.auth = new CustomDropboxAuth();
    this.dropbox = new Dropbox({
      auth: this.auth,
    });
  }
  private static referenceToFileEntry(
    reference: DropboxReference
  ): IFileEntry | null {
    switch (reference[".tag"]) {
      case "file":
        return {
          fileName: reference.name,
          size: reference.size,
          modified: new Date(Date.parse(reference.client_modified)),
        };
      case "folder":
        return {
          fileName: reference.name,
          size: 0,
          dir: true,
        };
      case "deleted":
        return null;
    }
  }
  async list(path: Path): Promise<IListResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    const allFiles: DropboxReference[] = [];
    let hasMore = false;
    let fileResult = await this.dropbox.filesListFolder({
      path: DROPBOX_APP_FOLDER + path.join("/"),
      recursive: false,
    });
    do {
      allFiles.push(...fileResult.result.entries);
      hasMore = fileResult.result.has_more;
      if (hasMore) {
        fileResult = await this.dropbox.filesListFolderContinue({
          cursor: fileResult.result.cursor,
        });
      }
    } while (hasMore);

    return {
      ok: true,
      files: Promise.resolve(
        allFiles
          .map((reference) => DropboxProvider.referenceToFileEntry(reference))
          .filter(Boolean) as IFileEntry[]
      ),
    };
  }
  async mkdir(path: Path, name: string): Promise<IWriteResult> {
    throw new Error("Method not implemented.");
  }
  async unlink(path: Path, fileName: string): Promise<IWriteResult> {
    throw new Error("Method not implemented.");
  }
  async read(path: Path, fileName: string): Promise<IReadResult> {
    throw new Error("Method not implemented.");
  }
  async write(
    path: Path,
    fileName: string,
    data: Promise<Blob>
  ): Promise<IWriteResult> {
    throw new Error("Method not implemented.");
  }
}
