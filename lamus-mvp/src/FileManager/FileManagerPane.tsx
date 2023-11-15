import { observer } from "mobx-react-lite";
import { FileManagerPane as FileManagerPaneState } from "./stores/FileManagerStore";
import { FilePathBreadcrumbBar } from "./FilePathBreadcrumbBar";
import { AppStore } from "../stores/AppStore";
import { ListView } from "../components/ListView";
import { LoadStatus } from "./LoadStatus";
import { Spinner } from "../components/Spinner";
import { FileListItem } from "./FileListItem";
import * as classNames from "./FileManagerPane.module.css";
import { useCallback, useState } from "react";
import { FileName } from "../stores/fileSystem/IFileSystemProvider";
import { ListViewChangeEvent } from "../components/ListView/ListViewList";

const FileManagerPane = observer(function FileManagerPane({
  pane,
  className,
  itemClassName,
  onFocus,
  onBlur,
}: {
  pane: FileManagerPaneState;
  className?: string;
  itemClassName?: string;
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;
}) {
  const [selectedFiles, setSelectedFiles] = useState<undefined | FileName[]>(
    undefined
  );

  const onSelectionChange = useCallback((e: ListViewChangeEvent) => {
    setSelectedFiles(e.detail.value);
  }, []);

  let foundFirstNotParentDir = false;
  const listViewItems = pane.items.map((file) => {
    let focusThisOneAfterLoad: boolean | undefined = undefined;
    if (
      (!file.parentDir && !foundFirstNotParentDir) ||
      pane.items.length === 1
    ) {
      foundFirstNotParentDir = true;
      focusThisOneAfterLoad = true;
    }
    return (
      <ListView.Item
        key={file.guid}
        value={file.guid}
        className={itemClassName}
        data-guid={file.guid}
        data-focus-initial={focusThisOneAfterLoad}
        // onDoubleClick={onFileEntryDoubleClick}
      >
        <FileListItem file={file} />
      </ListView.Item>
    );
  });

  return (
    <div className={className}>
      <div className={classNames.PanePath}>
        {pane.location && (
          <FilePathBreadcrumbBar
            currentStorageName={
              AppStore.fileSystem.providers.get(pane.location.providerId)?.name
            }
            currentPath={pane.location.path}
            // onGoToPath={onGoToPath}
            // onStorageContextMenu={onStorageProviderCrumbContextMenu}
            // onFocus={() => setPathFocused(true)}
            // onBlur={() => setPathFocused(false)}
          />
        )}
      </div>
      <div className={classNames.PaneList}>
        {pane.status === LoadStatus.LOADING && <Spinner />}
        {pane.status === LoadStatus.OK && (
          <ListView.List
            multiple
            value={selectedFiles}
            onChange={onSelectionChange}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {listViewItems}
          </ListView.List>
        )}
      </div>
    </div>
  );
});

FileManagerPane.displayName = "FileManagerPane";

export default FileManagerPane;

type EventHandler<T = undefined> = (arg: T) => void;
