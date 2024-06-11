import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef } from "react";
import { ListView } from "../components/ListView";
import { ListViewChangeEvent } from "../components/ListView/ListViewList";
import { Spinner } from "../components/Spinner";
import { AppStore } from "../stores/AppStore";
import { FileListItem } from "./FileListItem";
import * as classNames from "./FileManagerPane.module.css";
import { FilePathBreadcrumbBar } from "./FilePathBreadcrumbBar";
import { LoadStatus } from "./LoadStatus";
import { SelectStorageDialog } from "./SelectStorageDialog";
import { fileComparator } from "./sortFiles";
import { FileManagerPaneStore as FileManagerPaneState } from "./stores/FileManagerPaneStore";

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

  const onSelectionChange = useCallback((e: ListViewChangeEvent) => {
    pane.setSelectedFiles(e.detail.value);
  }, []);

  let foundFirstNotParentDir = false;
  const listViewItems = pane.items
    .slice()
    .sort(fileComparator())
    .map((file) => {
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

  useEffect(() => {
    if (pane.status !== LoadStatus.OK) return;

    const timeout = window.setTimeout(() => {
      let defaultLeftFocus =
        paneListEl.current?.querySelector<HTMLElement>(`[data-focus-initial]`);
      if (!defaultLeftFocus)
        defaultLeftFocus = paneListEl.current?.querySelector<HTMLElement>("li");

      defaultLeftFocus?.focus();
    }, 20);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pane.status]);

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
            value={Array.from(pane.selectedFiles.values())}
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
