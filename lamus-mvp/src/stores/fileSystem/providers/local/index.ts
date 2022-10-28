import {
  IAccessResult,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IWriteResult,
  Path,
} from "../../IFileSystemProvider";

export class LocalProvider implements IFileSystemProvider {
  isCloud = false;
  name: string;
  private url: string;
  constructor(url: string, name: string) {
    this.name = name;
    this.url = url;
  }
  init(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  access(path: Path, name: string): Promise<IAccessResult> {
    throw new Error("Method not implemented.");
  }
  list(path: Path): Promise<IListResult> {
    throw new Error("Method not implemented.");
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
  read(path: Path, fileName: string): Promise<IReadResult> {
    throw new Error("Method not implemented.");
  }
  write(
    path: Path,
    fileName: string,
    data: Promise<Blob>,
    meta?: any
  ): Promise<IWriteResult> {
    throw new Error("Method not implemented.");
  }
}
