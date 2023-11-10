import { ProviderId } from "../stores/FileSystemStore";
import {
  FILE_PATH_SEPARATOR,
  FileName,
  PROVIDER_SEPARATOR,
  Path,
} from "../stores/fileSystem/IFileSystemProvider";

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
  ].join("");
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
