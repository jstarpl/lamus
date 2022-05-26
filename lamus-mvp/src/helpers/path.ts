import { FileName, Path } from "../stores/fileSystem/IFileSystemProvider";
import { ProviderId } from "../stores/FileSystemStore";

const PATH_SEPARATOR = "/";

export function pathToUrl(
  path: Path,
  fileName: FileName | undefined,
  providerId: ProviderId | undefined,
  base: URL | string
): URL;
export function pathToUrl(
  path: Path,
  fileName: FileName | undefined,
  providerId: ProviderId,
  base?: URL | string
): URL;
export function pathToUrl(
  path: Path,
  fileName?: FileName,
  providerId?: ProviderId,
  base?: URL | string
): URL {
  if (!providerId && !base)
    throw new Error("Either base or providerId needs to be set");

  let url = "";
  // filter out any empty segments, if present
  const joinedPath: (string | undefined)[] = path.filter(Boolean).slice();
  // add the fileName or an empty segment at the end
  joinedPath.push(fileName);
  if (providerId) {
    url += `//${providerId}/`;
  }
  url += pathToString(path);
  return new URL(url, base ?? "file://");
}

export function urlToPath(url: URL): {
  providerId: ProviderId;
  path: Path;
  fileName: FileName | undefined;
} {
  if (url.protocol !== "file:") throw new Error("Unsupported protocol");
  const pathName = url.pathname;
  let pathSegments = pathName.split(PATH_SEPARATOR);
  // if there's a trailing slash, the pop() will return an empty string, which we then turn to an undefined
  let fileName = pathSegments.pop() || undefined;
  // we've gotten the last element of the pathName, we can filter out any empty entries
  pathSegments = pathSegments.filter(Boolean);
  const providerId = url.hostname;

  return {
    providerId,
    path: pathSegments,
    fileName,
  };
}

export function pathToString(path: Path): string {
  return path.join(PATH_SEPARATOR);
}
