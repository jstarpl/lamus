import { IFileSystemProvider, Path } from "../IFileSystemProvider";
import { resolvePath } from "./paths";

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
