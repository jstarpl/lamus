import { observer } from "mobx-react-lite";
import { FileManagerPane as FileManagerPaneState } from "./stores/FileManagerStore";
import { FilePathBreadcrumbBar } from "./FilePathBreadcrumbBar";
import { AppStore } from "../stores/AppStore";
import { ListView } from "../components/ListView";
import { LoadStatus } from "./LoadStatus";
import { Spinner } from "../components/Spinner";
import { FileListItem } from "./FileListItem";
import * as classNames from "./FileManagerPane.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileName } from "../stores/fileSystem/IFileSystemProvider";
import { ListViewChangeEvent } from "../components/ListView/ListViewList";
import { SelectStorageDialog } from "./SelectStorageDialog";
import { autorun } from "mobx";

const FileManagerPane = observer(function FileManagerPane({
  pane,
  className,
  itemClassName,
  onFocus,
  onBlur,
  onFileEntryDoubleClick,
  onGoToPath,
}: {
  pane: FileManagerPaneState;
  className?: string;
  itemClassName?: string;
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;
  onFileEntryDoubleClick?: React.MouseEventHandler<HTMLLIElement>;
  onGoToPath?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const paneListEl = useRef<HTMLDivElement>(null);
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
        onDoubleClick={onFileEntryDoubleClick}
      >
        <FileListItem file={file} />
      </ListView.Item>
    );
  });

  function onStorageProviderCrumbContextMenu(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.preventDefault();
    onChangeStorageBegin();
  }

  function onChangeStorageBegin() {
    pane.setChangingStorage(true);
  }

  function onCloseChangeStorageDialog() {
    pane.setChangingStorage(false);
  }

  function onChangeStorage(newProviderId: string) {
    pane.setChangingStorage(false);
    pane.setLocation({
      path: [],
      providerId: newProviderId,
    });
  }

  useEffect(
    () =>
      autorun(() => {
        const status = pane.status;
        if (status !== LoadStatus.OK) return;

        window.setTimeout(() => {
          const defaultLeftFocus = document.querySelector<HTMLElement>(
            `.${className}[data-focus-initial]`
          );
          defaultLeftFocus?.focus();
        }, 20);
      }),
    []
  );

  return (
    <div className={className}>
      <div className={classNames.PanePath}>
        {pane.location && (
          <FilePathBreadcrumbBar
            currentStorageName={
              AppStore.fileSystem.providers.get(pane.location.providerId)?.name
            }
            currentPath={pane.location.path}
            onGoToPath={onGoToPath}
            onStorageContextMenu={onStorageProviderCrumbContextMenu}
            // onFocus={() => setPathFocused(true)}
            // onBlur={() => setPathFocused(false)}
          />
        )}
      </div>
      <div className={classNames.PaneList} ref={paneListEl}>
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
      <SelectStorageDialog
        show={pane.isChangingStorage}
        currentStorage={pane.location?.providerId}
        label="Select storage:"
        onChangeStorage={onChangeStorage}
        onDismiss={onCloseChangeStorageDialog}
      />
    </div>
  );
});

FileManagerPane.displayName = "FileManagerPane";

export default FileManagerPane;

type EventHandler<T = undefined> = (arg: T) => void;
