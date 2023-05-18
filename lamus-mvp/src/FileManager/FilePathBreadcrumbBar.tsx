import React, { useLayoutEffect, useRef, useState } from "react";
import { BreadcrumbBar } from "../components/BreadcrumbBar";
import {
  Path,
  PROVIDER_SEPARATOR,
} from "../stores/fileSystem/IFileSystemProvider";

export function FilePathBreadcrumbBar({
  currentStorageName,
  currentPath,
  onFocus,
  onBlur,
  onGoToPath,
  onStorageContextMenu,
}: {
  currentStorageName: string | undefined;
  currentPath: Path;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onGoToPath?: React.MouseEventHandler<HTMLButtonElement>;
  onStorageContextMenu?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [crunchPathCount, setCrunchPathCount] = useState(0);
  const lastPathLength = useRef(0);

  useLayoutEffect(() => {
    if (!ref || lastPathLength.current > currentPath.length) {
      lastPathLength.current = currentPath.length;
      setCrunchPathCount(0);
      return;
    }

    lastPathLength.current = currentPath.length;

    const { width } = ref.getBoundingClientRect();
    const scrollWidth = ref.scrollWidth;

    if (width >= scrollWidth) {
      return;
    }

    const newCrunchPathCount = Math.max(
      0,
      Math.min(crunchPathCount + 1, currentPath.length - 1)
    );
    setCrunchPathCount(newCrunchPathCount);
  }, [ref, currentPath, crunchPathCount]);

  const pathToRender = currentPath.slice(crunchPathCount);

  return (
    <BreadcrumbBar.Bar onFocus={onFocus} onBlur={onBlur} ref={setRef}>
      <BreadcrumbBar.Crumb
        data-path={JSON.stringify([])}
        onClick={onGoToPath}
        onContextMenu={onStorageContextMenu}
      >
        {currentStorageName}
        {PROVIDER_SEPARATOR}
      </BreadcrumbBar.Crumb>
      <BreadcrumbBar.Separator />
      {pathToRender.length !== currentPath.length ? (
        <>
          <BreadcrumbBar.Separator separator="…" />
          <BreadcrumbBar.Separator />
        </>
      ) : null}
      {pathToRender.map((pathSegment, index, array) => (
        <React.Fragment key={`${crunchPathCount + index}_${pathSegment}`}>
          <BreadcrumbBar.Crumb
            data-path={JSON.stringify(
              currentPath.slice(0, crunchPathCount + index + 1)
            )}
            onClick={onGoToPath}
          >
            {pathSegment}
          </BreadcrumbBar.Crumb>
          {index !== array.length - 1 && <BreadcrumbBar.Separator />}
        </React.Fragment>
      ))}
    </BreadcrumbBar.Bar>
  );
}
