import { action, makeObservable, observable, ObservableMap } from "mobx";
import {
  FileName,
  IAccessResult,
  IDeleteResult,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IRenameResult,
  IWriteResult,
  Path,
} from "./fileSystem/IFileSystemProvider";

export type ProviderId = string;

export interface FileSystemLocation {
  providerId: ProviderId;
  path: Path;
}

export interface FileHandle extends FileSystemLocation {
  fileName: FileName;
  meta?: any;
}

export class FileSystemStoreClass {
  readonly providers: ObservableMap<ProviderId, IFileSystemProvider> =
    new Map() as ObservableMap;

  constructor() {
    makeObservable(this, {
      providers: observable.shallow,
      init: action,
      addProvider: action,
      removeProvider: action,
    });
  }

  init(): void {
    this.providers.clear();
  }

  addProvider(providerId: ProviderId, provider: IFileSystemProvider): void {
    this.providers.set(providerId, provider);
  }

  removeProvider(providerId: ProviderId): boolean {
    return this.providers.delete(providerId);
  }

  async listFiles(providerId: ProviderId, path: Path): Promise<IListResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.list(path);
  }

  async unlink(
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<IDeleteResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.unlink(path, fileName);
  }

  async access(
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<IAccessResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.access(path, fileName);
  }

  async mkdir(
    providerId: ProviderId,
    path: Path,
    name: FileName
  ): Promise<IMkDirResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.mkdir(path, name);
  }

  async rename(
    providerId: ProviderId,
    path: Path,
    oldName: FileName,
    newName: FileName
  ): Promise<IRenameResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.rename(path, oldName, newName);
  }

  async write(
    providerId: ProviderId,
    path: Path,
    fileName: FileName,
    data: Promise<Blob>,
    meta?: any
  ): Promise<IWriteResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.write(path, fileName, data, meta);
  }

  async read(
    providerId: ProviderId,
    path: Path,
    fileName: FileName
  ): Promise<IReadResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.read(path, fileName);
  }
}
