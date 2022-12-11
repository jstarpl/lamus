import { FileAccessMode, IFileSystem } from "@lamus/qbasic-vm";
import {
  FileName,
  FILE_PATH_SEPARATOR,
  Path,
  PROVIDER_SEPARATOR,
} from "../../stores/fileSystem/IFileSystemProvider";
import { FileSystemStoreClass, ProviderId } from "../../stores/FileSystemStore";

interface FileHandle {
  fileName: string;
  mode: FileAccessMode;
}

export class LamusStorage implements IFileSystem {
  pathSeparator: string = "/";
  private fileHandles: FileHandle[] = [];

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
  async access(filePath: string): Promise<boolean> {
    const { providerId, path, fileName } = deserializePath(filePath);
    if (!fileName) {
      return false;
    }

    const result = await this.fs.access(
      providerId ?? this.defaultProviderId,
      path,
      fileName
    );
    return result.ok;
  }
  open(handle: number, fileName: string, mode: FileAccessMode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  close(handle: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  write(handle: number, buf: string | number | object): Promise<void> {
    throw new Error("Method not implemented.");
  }
  read(handle: number): Promise<string | number | object> {
    throw new Error("Method not implemented.");
  }
  getAllContentsBlob(handle: number): Promise<Blob> {
    throw new Error("Method not implemented.");
  }
  seek(handle: number, pos: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  eof(handle: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  directory(fileSpec: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  kill(fileSpec: string): Promise<void>[] {
    throw new Error("Method not implemented.");
  }
}

export function deserializePath(serializedPath: string): {
  providerId?: ProviderId;
  path: Path;
  fileName?: FileName;
} {
  let providerId: ProviderId | undefined;
  let path: Path = [];
  let fileName: FileName | undefined;
  let contd = serializedPath;

  {
    let split = contd.split(PROVIDER_SEPARATOR + FILE_PATH_SEPARATOR, 2);
    if (split.length > 1) {
      providerId = split[0];
      contd = split[1];
    }
  }

  {
    let split = contd.split(FILE_PATH_SEPARATOR);
    path = split;
    if (!contd.endsWith(FILE_PATH_SEPARATOR)) {
      fileName = path.pop();
    }
  }

  return {
    providerId,
    path,
    fileName,
  };
}

export function serializePath(
  providerId: ProviderId,
  path: Path,
  fileName?: FileName
): string {
  return [
    providerId,
    PROVIDER_SEPARATOR,
    FILE_PATH_SEPARATOR,
    [...path, fileName].filter(Boolean).join(FILE_PATH_SEPARATOR),
  ].join();
}

export function normalizePath(path: Path): Path {
  const normalizedPath: Path = [];

  path.forEach((element) => {
    // refers to the "current directory", ignore
    if (element === ".") return;
    // refers to the "parent directory"
    if (element === "..") {
      normalizedPath.pop();
      return;
    }
    normalizedPath.push(element);
  });

  return normalizedPath;
}
