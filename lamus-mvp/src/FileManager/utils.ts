import { AppStore } from "src/stores/AppStore";
import { PROVIDER_SEPARATOR } from "src/stores/fileSystem/IFileSystemProvider";
import { FileSystemLocation } from "src/stores/FileSystemStore";

export function getLocationLabel(location: FileSystemLocation | null): string | null {
  if (!location) return null;

  if (location.path.length === 0) {
    const provider = AppStore.fileSystem.providers.get(location.providerId);
    if (!provider) return "(unknown)";
    return `${provider.name}${PROVIDER_SEPARATOR}`;
  }

  return location.path[location.path.length - 1];
}
