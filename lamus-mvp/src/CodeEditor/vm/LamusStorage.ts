import { FileAccessMode, IFileSystem } from "@lamus/qbasic-vm";
import picomatch from "picomatch";
import { assertNever } from "../../helpers/util";
import {
  FileName,
  IAccessResult,
  Path,
  FILE_PATH_SEPARATOR,
} from "../../stores/fileSystem/IFileSystemProvider";
import { FileSystemStoreClass, ProviderId } from "../../stores/FileSystemStore";
import { deserializePath, normalizePath } from "../../lib/fsUtils";

const ARRAY_BUFFER_BLOCK_SIZE = 512;

export const STRUCTURED_INPUT_MATCH = new RegExp(
  /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g
);

enum KnownMimeTypes {
  BINARY = "application/octet-stream",
  PLAIN = "text/plain",
  STRUCTURED_TEXT = "text/csv",
  JSON = "application/json",
}

interface FileHandleBase<
  Mode extends FileAccessMode,
  Buffer extends any,
  Metadata extends Record<string, any>
> {
  file: {
    fileName: FileName;
    path: Path;
    providerId: ProviderId;
  };
  cursor: number;
  modified: boolean;
  mode: Mode;
  buffer: Buffer;
  props: Metadata;
  meta?: any;
}

type FileHandleText = FileHandleBase<
  FileAccessMode.INPUT | FileAccessMode.OUTPUT | FileAccessMode.APPEND,
  string,
  {
    contentType: string;
  }
>;

type FileHandleObject = FileHandleBase<
  FileAccessMode.RANDOM,
  Record<string | number, any>[],
  {
    contentType: string;
  }
>;

type FileHandleBinary = FileHandleBase<
  FileAccessMode.BINARY,
  Uint8Array,
  {
    contentType: string;
    size: number;
  }
>;

type FileHandle = FileHandleText | FileHandleObject | FileHandleBinary;

export class LamusStorage implements IFileSystem {
  readonly pathSeparator: string = FILE_PATH_SEPARATOR;
  private fileHandles: (FileHandle | undefined)[] = [];
  private csvMatch = new RegExp(STRUCTURED_INPUT_MATCH);

  constructor(
    private fs: FileSystemStoreClass,
    private defaultProviderId: ProviderId
  ) {}
  getFreeFileHandle(): number {
    for (let i = 0; i <= this.fileHandles.length; i++) {
      if (this.fileHandles[i] === undefined) {
        return i;
      }
    }
    return 0;
  }
  getUsedFileHandles(): number[] {
    const used: number[] = [];
    for (let i = 0; i < this.fileHandles.length; i++) {
      if (this.fileHandles[i] !== undefined) {
        used.push(i);
      }
    }

    return used;
  }
  async access(fileNameOrUri: string): Promise<boolean> {
    // return false if it looks like a URL
    if (fileNameOrUri.match(/^https?:\/\//)) {
      return false;
    }

    let { providerId, path, fileName } = deserializePath(fileNameOrUri);
    path = normalizePath(path);
    if (!fileName) {
      return false;
    }

    const result = await this.fs.access(
      providerId ?? this.defaultProviderId,
      path,
      fileName
    );
    return result.ok ? result.found : false;
  }
  async open(
    handle: number,
    filePath: string,
    mode: FileAccessMode
  ): Promise<void> {
    if (this.fileHandles[handle]) {
      throw new Error(`File Handle is busy`);
    }

    let { providerId, path, fileName } = deserializePath(filePath);
    path = normalizePath(path);
    if (!fileName) {
      throw new Error(`Invalid File Path`);
    }

    const result = await this.fs.access(
      providerId ?? this.defaultProviderId,
      path,
      fileName
    );
    if (!result.ok) {
      throw new Error(`File System Error: ${result.error}`);
    }

    if (mode === FileAccessMode.INPUT) {
      await this.openForTextInput(
        handle,
        providerId ?? this.defaultProviderId,
        path,
        fileName
      );
    } else if (mode === FileAccessMode.OUTPUT) {
      await this.openForTextOutput(
        handle,
        providerId ?? this.defaultProviderId,
        path,
        fileName
      );
    } else if (mode === FileAccessMode.APPEND) {
      await this.openForTextAppend(
        handle,
        providerId ?? this.defaultProviderId,
        path,
        fileName
      );
    } else if (mode === FileAccessMode.RANDOM) {
      await this.openAsRandom(
        handle,
        providerId ?? this.defaultProviderId,
        path,
        fileName,
        result
      );
    } else if (mode === FileAccessMode.BINARY) {
      await this.openAsBinary(
        handle,
        providerId ?? this.defaultProviderId,
        path,
        fileName,
        result
      );
    } else {
      assertNever(mode);
      throw new Error(`Unknown access mode: ${mode}`);
    }
  }
  private async openForTextInput(
    handle: number,
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<void> {
    const readResult = await this.fs.read(
      providerId ?? this.defaultProviderId,
      path,
      fileName
    );
    if (!readResult.ok) {
      throw new Error(`File System Error: ${readResult.error}`);
    }
    const data = await readResult.data;
    this.fileHandles[handle] = {
      file: {
        fileName,
        path,
        providerId,
      },
      mode: FileAccessMode.INPUT,
      buffer: await data.text(),
      cursor: 0,
      modified: false,
      props: {
        contentType: data.type,
      },
      meta: readResult.meta,
    };
  }
  private async openForTextOutput(
    handle: number,
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<void> {
    this.fileHandles[handle] = {
      file: {
        fileName,
        path,
        providerId,
      },
      mode: FileAccessMode.OUTPUT,
      buffer: "",
      cursor: 0,
      modified: false,
      props: {
        contentType: KnownMimeTypes.STRUCTURED_TEXT,
      },
    };
  }
  private async openForTextAppend(
    handle: number,
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<void> {
    const readResult = await this.fs.read(
      providerId ?? this.defaultProviderId,
      path,
      fileName
    );
    let buffer = "";
    let meta = undefined;
    if (readResult.ok) {
      const data = await readResult.data;
      buffer = await data.text();
      meta = readResult.meta;
    }
    this.fileHandles[handle] = {
      file: {
        fileName,
        path,
        providerId,
      },
      mode: FileAccessMode.APPEND,
      buffer,
      cursor: buffer.length,
      modified: false,
      props: {
        contentType: KnownMimeTypes.STRUCTURED_TEXT,
      },
      meta,
    };
  }
  private async openAsRandom(
    handle: number,
    providerId: ProviderId,
    path: Path,
    fileName: FileName,
    accessResult: IAccessResult
  ): Promise<void> {
    let buffer: Record<string | number, any>[] = [];
    let meta = undefined;
    let modified = true;
    if (accessResult.ok && accessResult.found) {
      const readResult = await this.fs.read(
        providerId ?? this.defaultProviderId,
        path,
        fileName
      );
      if (!readResult.ok) {
        throw new Error(`File System Error: ${readResult.error}`);
      }
      const data = await readResult.data;
      meta = readResult.meta;
      modified = false;
      try {
        const parsed = JSON.parse(await data.text());
        buffer = parsed;
      } catch (e) {
        throw new Error(
          `File System Error: Invalid data format in existing file "${fileName}" for mode RANDOM`
        );
      }
    }
    this.fileHandles[handle] = {
      file: {
        fileName,
        path,
        providerId,
      },
      mode: FileAccessMode.RANDOM,
      buffer,
      cursor: 0,
      modified,
      props: {
        contentType: KnownMimeTypes.JSON,
      },
      meta,
    };
  }
  private async openAsBinary(
    handle: number,
    providerId: ProviderId,
    path: Path,
    fileName: FileName,
    accessResult: IAccessResult
  ): Promise<void> {
    let buffer: Uint8Array = new Uint8Array(
      new ArrayBuffer(ARRAY_BUFFER_BLOCK_SIZE)
    );
    let size = 0;
    let contentType: string = KnownMimeTypes.BINARY;
    let meta = undefined;
    let modified = true;
    if (accessResult.ok && accessResult.found) {
      const readResult = await this.fs.read(
        providerId ?? this.defaultProviderId,
        path,
        fileName
      );
      if (!readResult.ok) {
        throw new Error(`File System Error: ${readResult.error}`);
      }
      meta = readResult.meta;
      const data = await readResult.data;
      buffer = new Uint8Array(await data.arrayBuffer());
      contentType = data.type;
      size = buffer.byteLength;
      modified = false;
    }

    this.fileHandles[handle] = {
      file: {
        fileName,
        path,
        providerId,
      },
      mode: FileAccessMode.BINARY,
      buffer,
      cursor: 0,
      modified,
      props: {
        contentType,
        size,
      },
      meta,
    };
  }
  async close(handle: number): Promise<void> {
    try {
      await this.flush(handle);
    } catch (e) {
      console.error(e);
    }

    this.fileHandles[handle] = undefined;
  }
  async write(handle: number, buf: string | number | object): Promise<void> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle.");
    }
    if (fileHandle.mode === FileAccessMode.INPUT) {
      throw new Error("Wrong file access mode.");
    }

    if (
      fileHandle.mode === FileAccessMode.OUTPUT ||
      fileHandle.mode === FileAccessMode.APPEND
    ) {
      fileHandle.buffer =
        fileHandle.buffer.substring(0, fileHandle.cursor) +
        LamusStorage.serializeForWrite(buf) +
        ",";
      fileHandle.cursor = fileHandle.buffer.length;
    } else if (fileHandle.mode === FileAccessMode.RANDOM) {
      if (typeof buf !== "object") throw new Error("Invalid data to write");
      fileHandle.buffer[fileHandle.cursor] = buf;
      fileHandle.cursor++;
    } else if (fileHandle.mode === FileAccessMode.BINARY) {
      if (typeof buf !== "number") throw new Error("Invalid data to write");

      // If the buffer has no more space, expand the buffer by block size
      if (fileHandle.cursor >= fileHandle.buffer.length) {
        const newSize =
          Math.ceil(fileHandle.cursor / ARRAY_BUFFER_BLOCK_SIZE) *
          ARRAY_BUFFER_BLOCK_SIZE;
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(fileHandle.buffer);
        fileHandle.buffer = newBuffer;
      }

      fileHandle.buffer[fileHandle.cursor] = buf;
      fileHandle.props.size = Math.max(
        fileHandle.props.size,
        fileHandle.cursor
      );
      fileHandle.cursor++;
    } else {
      assertNever(fileHandle.mode);
      throw new Error("Unknown access mode");
    }

    fileHandle.modified = true;
    fileHandle.meta.modified = Date.now();
  }
  private static serializeForWrite(buf: string | number | object): string {
    if (typeof buf === "number") {
      return buf.toString(10);
    } else if (typeof buf === "string") {
      return '"' + buf.replace(/"/g, '""') + '"';
    } else {
      return Object.values(buf)
        .map((val) => this.serializeForWrite(val))
        .join(",");
    }
  }
  private static deserializeForRead(buf: string): string | number {
    if (buf.match(/^".*"$/)) {
      return buf.substr(1, buf.length - 2).replace(/""/g, '"');
    } else {
      return Number.parseFloat(buf);
    }
  }
  async read(handle: number): Promise<string | number | object> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle.");
    }
    if (fileHandle.mode === FileAccessMode.OUTPUT) {
      throw new Error("Invalid file access mode.");
    }

    let value: string | number | object;
    if (
      fileHandle.mode === FileAccessMode.INPUT ||
      fileHandle.mode === FileAccessMode.APPEND
    ) {
      this.csvMatch.lastIndex = fileHandle.cursor;
      const match = this.csvMatch.exec(fileHandle.buffer);
      value = "";
      if (match) {
        value = LamusStorage.deserializeForRead(match[1]);
        fileHandle.cursor = this.csvMatch.lastIndex;
      }
    } else if (fileHandle.mode === FileAccessMode.RANDOM) {
      value = fileHandle.buffer[fileHandle.cursor];
      fileHandle.cursor = Math.min(
        fileHandle.buffer.length,
        fileHandle.cursor + 1
      );
    } else if (fileHandle.mode === FileAccessMode.BINARY) {
      value = fileHandle.buffer[fileHandle.cursor];
      fileHandle.cursor = Math.min(
        fileHandle.props.size,
        fileHandle.cursor + 1
      );
    } else {
      assertNever(fileHandle.mode);
      throw new Error("Unknown access mode");
    }
    return value;
  }
  async getAllContentsBlob(handle: number): Promise<Blob> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle");
    }

    if (
      fileHandle.mode === FileAccessMode.INPUT ||
      fileHandle.mode === FileAccessMode.OUTPUT ||
      fileHandle.mode === FileAccessMode.APPEND
    ) {
      return new Blob([fileHandle.buffer], {
        type: fileHandle.props.contentType,
      });
    } else if (fileHandle.mode === FileAccessMode.BINARY) {
      return new Blob([fileHandle.buffer.subarray(0, fileHandle.props.size)], {
        type: fileHandle.props.contentType,
      });
    } else if (fileHandle.mode === FileAccessMode.RANDOM) {
      return new Blob([JSON.stringify(fileHandle.buffer)], {
        type: fileHandle.props.contentType,
      });
    } else {
      assertNever(fileHandle.mode);
      throw new Error("Unknown access mode");
    }
  }
  async seek(handle: number, pos: number): Promise<void> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle.");
    }
    if (
      fileHandle.mode === FileAccessMode.OUTPUT ||
      fileHandle.mode === FileAccessMode.APPEND
    ) {
      throw new Error("Invalid file access mode.");
    }

    fileHandle.cursor = pos;
  }
  async position(handle: number): Promise<number> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle.");
    }

    return fileHandle.cursor;
  }
  async eof(handle: number): Promise<boolean> {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle.");
    }

    if (fileHandle.mode === FileAccessMode.BINARY) {
      return fileHandle.cursor >= fileHandle.props.size;
    } else {
      return fileHandle.cursor >= fileHandle.buffer.length;
    }
  }
  async directory(fileSpec: string): Promise<string[]> {
    let { providerId, path, fileName } = deserializePath(fileSpec);
    const listResult = await this.fs.listFiles(
      providerId ?? this.defaultProviderId,
      path
    );
    if (!listResult.ok) {
      throw new Error(`File System Error: ${listResult.error}`);
    }

    const isMatch = picomatch(fileName ?? "");

    const files = await listResult.files;
    const filteredFiles = files.filter((fileEntry) =>
      isMatch(fileEntry.fileName)
    );
    return filteredFiles.map((fileEntry) => fileEntry.fileName);
  }
  async kill(fileSpec: string): Promise<void> {
    let { providerId, path, fileName } = deserializePath(fileSpec);
    const listResult = await this.fs.listFiles(
      providerId ?? this.defaultProviderId,
      path
    );
    if (!listResult.ok) {
      throw new Error(`File System Error: ${listResult.error}`);
    }

    const isMatch = picomatch(fileName ?? "");

    const files = await listResult.files;
    const filteredFiles = files.filter((fileEntry) =>
      isMatch(fileEntry.fileName)
    );
    await Promise.all(
      filteredFiles.map(async (fileEntry) => {
        await this.fs.unlink(
          providerId ?? this.defaultProviderId,
          path,
          fileEntry.fileName
        );
      })
    );
  }
  private async flush(handle: number) {
    const fileHandle = this.fileHandles[handle];
    if (!fileHandle) {
      throw new Error("Invalid file handle");
    }

    if (fileHandle.mode === FileAccessMode.INPUT) return;
    if (!fileHandle.modified) return;

    const writeResult = await this.fs.write(
      fileHandle.file.providerId,
      fileHandle.file.path,
      fileHandle.file.fileName,
      this.getAllContentsBlob(handle),
      fileHandle.meta
    );

    if (!writeResult.ok) {
      throw new Error(`File System Error: ${writeResult.error}`);
    }

    fileHandle.meta = writeResult.meta;
    fileHandle.file.fileName = writeResult.fileName ?? fileHandle.file.fileName;
    fileHandle.modified = false;
  }
}
