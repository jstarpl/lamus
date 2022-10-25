import { FileAccessMode, IFileSystem } from "@lamus/qbasic-vm";
import {
  FILE_PATH_SEPARATOR,
  Path,
  PROVIDER_SEPARATOR,
} from "../../stores/fileSystem/IFileSystemProvider";

export class LamusStorage implements IFileSystem {
  pathSeparator: string = "/";

  getFreeFileHandle(): number {
    throw new Error("Method not implemented.");
  }
  getUsedFileHandles(): number[] {
    throw new Error("Method not implemented.");
  }
  access(fileName: string): Promise<boolean> {
    throw new Error("Method not implemented.");
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
  providerId?: string;
  path: Path;
} {
  throw new Error("Not implemented.");
}

export function serializePath(
  providerId: string,
  path: Path,
  fileName?: string
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
