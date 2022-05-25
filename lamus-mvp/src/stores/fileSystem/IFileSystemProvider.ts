export type Path = string[];
export type FileName = string;
export type FileSize = number;

export interface IFileEntry {
  readonly fileName: FileName;
  readonly dir?: boolean;
  readonly size: FileSize;
  readonly created?: Date;
  readonly modified?: Date;
}

export interface IReadResultFailure {
  readonly ok: false;
  readonly error: string;
}

export interface IReadResultSuccess {
  readonly ok: true;
  readonly data: Promise<Blob>;
  readonly meta?: any;
}

export type IReadResult = IReadResultSuccess | IReadResultFailure;

export interface IWriteResultFailure {
  readonly ok: false;
  readonly error: string;
}

export interface IWriteResultSuccess {
  readonly ok: true;
  readonly fileName?: FileName;
  readonly meta?: any;
}

export type IWriteResult = IWriteResultSuccess | IWriteResultFailure;

export interface IMkDirResultFailure {
  readonly ok: false;
  readonly error: string;
}

export interface IMkDirResultSuccess {
  readonly ok: true;
}

export type IMkDirResult = IMkDirResultSuccess | IMkDirResultFailure;
export type IDeleteResult = IMkDirResult;

export interface IListResultFailure {
  readonly ok: false;
  readonly error: string;
}

export interface IListResultSuccess {
  readonly ok: true;
  readonly files: Promise<IFileEntry[]>;
}

export type IListResult = IListResultSuccess | IListResultFailure;

export interface IFileSystemProvider {
  readonly isCloud: boolean;
  readonly name: string;

  init(): Promise<void>;
  list(path: Path): Promise<IListResult>;
  mkdir(path: Path, name: FileName): Promise<IMkDirResult>;
  unlink(path: Path, fileName: FileName): Promise<IDeleteResult>;
  read(path: Path, fileName: FileName): Promise<IReadResult>;
  write(
    path: Path,
    fileName: FileName,
    data: Promise<Blob>,
    meta?: any
  ): Promise<IWriteResult>;
}
