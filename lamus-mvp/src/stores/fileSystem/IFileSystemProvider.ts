export type Path = string[];
export type FileName = string;
export type FileSize = number;

export interface IFileEntry {
  fileName: FileName;
  dir?: boolean;
  size: FileSize;
  created?: Date;
  modified?: Date;
}

export interface IReadResultFailure {
  ok: false;
  error: string;
}

export interface IReadResultSuccess {
  ok: true;
  data: Promise<Blob>;
}

export type IReadResult = IReadResultSuccess | IReadResultFailure;

export interface IWriteResultFailure {
  ok: false;
  error: string;
}

export interface IWriteResultSuccess {
  ok: true;
}

export type IWriteResult = IWriteResultSuccess | IWriteResultFailure;
export type IDeleteResult = IWriteResult;
export type IMkDirResult = IWriteResult;

export interface IListResultFailure {
  ok: false;
  error: string;
}

export interface IListResultSuccess {
  ok: true;
  files: Promise<IFileEntry[]>;
}

export type IListResult = IListResultSuccess | IListResultFailure;

export interface IFileSystemProvider {
  isCloud: boolean;
  name: string;

  init(): Promise<void>;
  list(path: Path): Promise<IListResult>;
  mkdir(path: Path, name: FileName): Promise<IMkDirResult>;
  unlink(path: Path, fileName: FileName): Promise<IDeleteResult>;
  read(path: Path, fileName: FileName): Promise<IReadResult>;
  write(
    path: Path,
    fileName: FileName,
    data: Promise<Blob>
  ): Promise<IWriteResult>;
}
