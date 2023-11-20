import React from "react";
import { FileManagerStore } from "./stores/FileManagerStore";
import { PROVIDER_SEPARATOR } from "../stores/fileSystem/IFileSystemProvider";
import { AppStore } from "../stores/AppStore";
import { FileSystemLocation } from "../stores/FileSystemStore";
import * as classNames from "./FileManagerTabs.module.css";
import { observer } from "mobx-react-lite";

export const FileManagerTabs = observer(function FileManagerTabs({
  className,
}: {
  className?: string;
}): JSX.Element | null {
  const leftPaneLocation = getLocationLabel(FileManagerStore.leftPane.location);

  const rightPaneLocation = getLocationLabel(
    FileManagerStore.rightPane.location
  );

  const onChangePane = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!(e.target instanceof HTMLButtonElement)) return;
    if (
      e.target.dataset["pane"] !== "left" &&
      e.target.dataset["pane"] !== "right"
    )
      return;

    FileManagerStore.setDisplayFocus(e.target.dataset["pane"]);
  };

  return (
    <div className={`${classNames.PaneTabs} ${className ?? ""}`}>
      <button
        className={
          FileManagerStore.displayFocus === "left"
            ? classNames.PaneTabSelected
            : classNames.PaneTab
        }
        data-pane="left"
        onClick={onChangePane}
      >
        {leftPaneLocation ?? "…"}
      </button>
      <button
        className={
          FileManagerStore.displayFocus === "right"
            ? classNames.PaneTabSelected
            : classNames.PaneTab
        }
        data-pane="right"
        onClick={onChangePane}
      >
        {rightPaneLocation ?? "…"}
      </button>
    </div>
  );
});
FileManagerTabs.displayName = "FileManagerTabs";

function getLocationLabel(location: FileSystemLocation | null): string | null {
  if (!location) return null;

  if (location.path.length === 0) {
    const provider = AppStore.fileSystem.providers.get(location.providerId);
    if (!provider) return "(unknown)";
    return `${provider.name}${PROVIDER_SEPARATOR}`;
  }

  return location.path[location.path.length - 1];
}
