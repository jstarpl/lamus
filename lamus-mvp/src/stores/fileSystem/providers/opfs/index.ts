import { assertNever } from "../../../../helpers/util";
import {
  IAccessResult,
  IFileEntry,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IWriteResult,
  Path,
} from "../../IFileSystemProvider";

/// <reference path="./originFileSystem.d.ts" />

export class OPFSProvider implements IFileSystemProvider {
  isCloud = false;
  name: string;
  private directoryHandle: FileSystemDirectoryHandle | undefined;
  constructor(name: string) {
    this.name = name;
  }
  async init(): Promise<void> {
    this.directoryHandle = await navigator.storage.getDirectory();
    if ((await navigator.storage.persisted()) === false) {
      await navigator.storage.persist();
    }
  }
  async access(path: Path, name: string): Promise<IAccessResult> {
    if (!this.directoryHandle) throw new Error("Not initialized");

    try {
      const parentDirectory = await this.resolvePath(path);
      await parentDirectory.getFileHandle(name, {
        create: false,
      });

      return {
        ok: true,
        found: true,
      };
    } catch {
      return {
        ok: true,
        found: false,
      };
    }
  }
  async list(path: Path): Promise<IListResult> {
    if (!this.directoryHandle) throw new Error("Not initialized");

    try {
      const parentDirectory = await this.resolvePath(path);

      let files: IFileEntry[] = [];

      for await (let [fileName, handle] of parentDirectory.entries()) {
        if (handle.kind === "directory") {
          files.push({
            fileName,
            size: 0,
            dir: true,
          });
        } else if (handle.kind === "file") {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          files.push({
            fileName,
            size: file.size,
            modified: new Date(file.lastModified),
          });
        } else {
          assertNever(handle.kind);
        }
      }

      return {
        ok: true,
        files: Promise.resolve(files),
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  mkdir(path: Path, name: string): Promise<IMkDirResult> {
    throw new Error("Method not implemented.");
  }
  rename(
    path: Path,
    oldFileName: string,
    newFileName: string
  ): Promise<IMkDirResult> {
    throw new Error("Method not implemented.");
  }
  unlink(path: Path, fileName: string): Promise<IMkDirResult> {
    throw new Error("Method not implemented.");
  }
  async read(path: Path, fileName: string): Promise<IReadResult> {
    if (!this.directoryHandle) throw new Error("Not initialized");
    try {
      const parentDirectory = await this.resolvePath(path);
      const fileHandle = await parentDirectory.getFileHandle(fileName, {
        create: false,
      });
      return {
        ok: true,
        data: fileHandle.getFile(),
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
    meta?: any
  ): Promise<IWriteResult> {
    if (!this.directoryHandle) throw new Error("Not initialized");
    try {
      const parentDirectory = await this.resolvePath(path);
      const fileHandle = await parentDirectory.getFileHandle(fileName, {
        create: true,
      });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write({
        data: await data,
        position: 0,
        type: "write",
      });
      await writableStream.close()
      return {
        ok: true,
        fileName: fileName,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  private async resolvePath(path: Path): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) throw new Error("Not initialized");

    let currentWorkingDirectory = this.directoryHandle;
    for (const directory of path) {
      if (!directory) continue;

      currentWorkingDirectory =
        await currentWorkingDirectory.getDirectoryHandle(directory);
    }
    return currentWorkingDirectory;
  }
  static isSupported(): boolean {
    if (
      "storage" in navigator &&
      "getDirectory" in navigator.storage &&
      "persist" in navigator.storage
    ) {
      return true;
    }
    return false;
  }
}

declare global {
  interface FileSystemDirectoryHandle
    extends FileSystemHandle,
      AsyncIterable<FileSystemHandle> {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
    values(): AsyncIterable<FileSystemHandle>;
    keys(): AsyncIterable<string>;
  }

  type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;
  type WritableStreamData = ArrayBuffer | TypedArray | DataView | Blob | String;
  type WriteOptions = {
    data?: WritableStreamData;
    type?: "write" | "seek" | "truncate";
    position?: number;
    size?: number;
  };

  interface FileSystemWritableStream extends WritableStream {
    write(data: WritableStreamData | WriteOptions): Promise<void>;
    truncate(size?: number): Promise<void>;
    seek(position?: number): Promise<void>;
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableStream>;
  }

  interface FileSystemHandle {
    remove(options?: { recursive: boolean }): Promise<void>;
    move(fileName: string): Promise<void>;
    move(
      directoryHandle: FileSystemDirectoryHandle,
      fileName?: string
    ): Promise<void>;
  }
}
