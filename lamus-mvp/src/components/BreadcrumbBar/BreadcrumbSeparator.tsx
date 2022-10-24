import { FILE_PATH_SEPARATOR } from "../../stores/fileSystem/IFileSystemProvider";
import "./BreadcrumbSeparator.css";

export function BreadcrumbSeparator({ separator }: { separator?: string }) {
  return (
    <div className="BreadcrumbBar__Separator">
      {separator ?? FILE_PATH_SEPARATOR}
    </div>
  );
}
