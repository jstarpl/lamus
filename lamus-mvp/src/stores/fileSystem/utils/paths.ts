import { Path } from "../IFileSystemProvider";

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
