export type Path = string[];
export type FileName = string;
export type FileSize = number;

export const FILE_PATH_SEPARATOR = "/";
export const PROVIDER_SEPARATOR = ":";

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

export interface IAccessResultFailure {
  readonly ok: false;
  readonly error: string;
}

export interface IAccessResultSuccess {
  readonly ok: true;
  readonly found: boolean;
  readonly meta?: any;
}

export type IAccessResult = IAccessResultSuccess | IAccessResultFailure;

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
export type IRenameResult = IMkDirResult;

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
  access(path: Path, name: FileName): Promise<IAccessResult>;
  mkdir(path: Path, name: FileName): Promise<IMkDirResult>;
  unlink(path: Path, fileName: FileName): Promise<IDeleteResult>;
  rename(
    path: Path,
    oldFileName: FileName,
    newFileName: FileName
  ): Promise<IRenameResult>;
  read(path: Path, fileName: FileName): Promise<IReadResult>;
  write(
    path: Path,
    fileName: FileName,
    data: Promise<Blob>,
    meta?: any
  ): Promise<IWriteResult>;
}

export function resolvePath(basePath: Path, ...paths: Path[]) {
  let resolvedPath = basePath.slice();

  for (const path of paths) {
    for (const fragment of path) {
      if (fragment === "..") {
        resolvedPath.pop();
      } else if (fragment === ".") {
        continue;
      } else {
        resolvedPath.push(fragment);
      }
    }
  }

  return resolvedPath;
}

export async function copyFile(
  sourceProvider: IFileSystemProvider,
  sourcePath: Path,
  fileName: string,
  targetProvider: IFileSystemProvider,
  targetPath: Path
) {
  const readRes = await sourceProvider.read(sourcePath, fileName);
  if (!readRes.ok) {
    console.error(readRes);
    throw new Error(`Could not read source file: "${fileName}"`);
  }
  await targetProvider.write(targetPath, fileName, readRes.data);
}

export async function copyDirectory(
  sourceProvider: IFileSystemProvider,
  sourcePath: Path,
  dirName: string,
  targetProvider: IFileSystemProvider,
  targetPath: Path
) {
  const sourceDirPath = resolvePath(sourcePath, [dirName]);
  const targetDirPath = resolvePath(targetPath, [dirName]);
  const mkDirRes = await targetProvider.mkdir(targetPath, dirName);
  if (!mkDirRes.ok) {
    console.error(mkDirRes);
    throw new Error(`Could not create directory: "${dirName}"`);
  }

  const listItemsRes = await sourceProvider.list(sourceDirPath);
  if (!listItemsRes.ok) {
    console.error(listItemsRes);
    throw new Error(`Could not list contents of directory: "${dirName}"`);
  }

  for (const entry of await listItemsRes.files) {
    if (entry.dir) {
      await copyDirectory(
        sourceProvider,
        sourceDirPath,
        entry.fileName,
        targetProvider,
        targetDirPath
      );
    } else {
      await copyFile(
        sourceProvider,
        sourceDirPath,
        entry.fileName,
        targetProvider,
        targetDirPath
      );
    }
  }
}
