import {
  IAccessResult,
  IDeleteResult,
  IFileEntry,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IRenameResult,
  IWriteResult,
  Path,
} from "../../IFileSystemProvider";
import {
  Dropbox,
  DropboxAuth,
  DropboxResponse,
  DropboxResponseError,
  files,
} from "dropbox";
import { CustomDropboxAuth } from "./CustomDropboxAuth";

const DROPBOX_ROOT_FOLDER = "/";

type DropboxReference =
  | files.FileMetadataReference
  | files.FolderMetadataReference
  | files.DeletedMetadataReference;

function isError(res: DropboxResponse<any>): boolean {
  if (res.status >= 400) {
    return true;
  }
  return false;
}

export class DropboxProvider implements IFileSystemProvider {
  private dropbox: Dropbox | null = null;
  private auth: DropboxAuth | null = null;

  isCloud = true;
  name = "Dropbox";

  async init(): Promise<void> {
    this.auth = new CustomDropboxAuth();
    this.dropbox = new Dropbox({
      auth: this.auth,
    });
    const reply = await this.dropbox.checkUser({
      query: "hello",
    });
    if (isError(reply) && reply.result !== "hello")
      throw new Error("Unable to initialize Dropbox FileSystem provider");
  }
  private static referenceToFileEntry(
    reference: DropboxReference
  ): IFileEntry | null {
    switch (reference[".tag"]) {
      case "file":
        return {
          fileName: reference.name,
          size: reference.size,
          modified: new Date(Date.parse(reference.server_modified)),
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
  async access(path: Path, name: string): Promise<IAccessResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    try {
      const result = await this.dropbox.filesGetMetadata({
        path: DROPBOX_ROOT_FOLDER + [...path, name].join("/"),
      });

      if (isError(result)) {
        return {
          ok: false,
          error: String(result.status),
        };
      }

      if (result.result[".tag"] === "folder") {
        return {
          ok: false,
          error: "There is a folder of the same name",
        };
      }

      const found = result.result[".tag"] === "file";

      return {
        ok: true,
        found,
        meta: result.result[".tag"] === "file" ? result.result.rev : undefined,
      };
    } catch (e) {
      if (e instanceof DropboxResponseError) {
        const error = e.error as DropboxResponseError<files.GetMetadataError>;
        if (
          error.error[".tag"] === "path" &&
          error.error.path?.[".tag"] === "not_found"
        ) {
          return {
            ok: true,
            found: false,
          };
        }
      }

      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async list(path: Path): Promise<IListResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    try {
      const allFiles: DropboxReference[] = [];
      let hasMore = false;
      let fileResult = await this.dropbox.filesListFolder({
        path: path.length === 0 ? "" : DROPBOX_ROOT_FOLDER + path.join("/"),
        recursive: false,
      });

      if (isError(fileResult)) {
        return {
          ok: false,
          error: String(fileResult.status),
        };
      }

      do {
        allFiles.push(...fileResult?.result?.entries);
        hasMore = fileResult.result.has_more;
        if (hasMore) {
          fileResult = await this.dropbox.filesListFolderContinue({
            cursor: fileResult.result.cursor,
          });

          if (isError(fileResult)) {
            console.error(fileResult);
            hasMore = false;
          }
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
    } catch (e) {
      console.error(e);
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async mkdir(path: Path, name: string): Promise<IMkDirResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    try {
      const result = await this.dropbox.filesCreateFolderV2({
        path: DROPBOX_ROOT_FOLDER + [...path, name].join("/"),
      });

      if (isError(result)) {
        console.error(result);
        return {
          ok: false,
          error: String(result.status),
        };
      }

      return {
        ok: true,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async unlink(path: Path, fileName: string): Promise<IDeleteResult> {
    throw new Error("Method not implemented.");
  }
  async read(path: Path, fileName: string): Promise<IReadResult> {
    throw new Error("Method not implemented.");
  }
  async rename(
    path: Path,
    oldFileName: string,
    newFileName: string
  ): Promise<IRenameResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    try {
      const result = await this.dropbox.filesMoveV2({
        from_path: DROPBOX_ROOT_FOLDER + [...path, oldFileName].join("/"),
        to_path: DROPBOX_ROOT_FOLDER + [...path, newFileName].join("/"),
      });

      if (isError(result)) {
        console.error(result);
        return {
          ok: false,
          error: String(result.status),
        };
      }

      return {
        ok: true,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async write(
    path: Path,
    fileName: string,
    data: Promise<Blob>,
    meta: any
  ): Promise<IWriteResult> {
    if (!this.dropbox) throw new Error("Not initialized");

    try {
      const result = await this.dropbox.filesUpload({
        path: DROPBOX_ROOT_FOLDER + [...path, fileName].join("/"),
        mode: meta
          ? {
              ".tag": "update",
              update: String(meta),
            }
          : {
              ".tag": "add",
            },
        autorename: true,
        contents: await data,
      });

      if (isError(result)) {
        console.error(result);
        return {
          ok: false,
          error: String(result.status),
        };
      }

      return {
        ok: true,
        fileName:
          result.result.name !== fileName ? result.result.name : undefined,
        meta: result.result.rev,
      };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
        error: String(e),
      };
    }
  }
}
