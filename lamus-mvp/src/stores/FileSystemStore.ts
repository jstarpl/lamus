import { action, makeObservable, observable, ObservableMap } from "mobx";
import {
  FileName,
  IDeleteResult,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IWriteResult,
  Path,
} from "./fileSystem/IFileSystemProvider";

type ProviderId = string;

export interface FileHandle {
  providerId: ProviderId;
  path: Path;
  fileName: FileName;
}

class FileSystemStoreClass {
  readonly providers: ObservableMap<ProviderId, IFileSystemProvider> =
    new Map() as ObservableMap;

  constructor() {
    makeObservable(this, {
      providers: observable.shallow,
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

  async mkdir(
    providerId: ProviderId,
    path: Path,
    name: FileName
  ): Promise<IMkDirResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.mkdir(path, name);
  }

  async write(
    providerId: ProviderId,
    path: Path,
    fileName: FileName,
    data: Promise<Blob>
  ): Promise<IWriteResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found!`);

    return provider.write(path, fileName, data);
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

export const FileSystemStore = new FileSystemStoreClass();
