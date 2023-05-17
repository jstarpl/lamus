import React from "react";
import { observer } from "mobx-react-lite";
import { ProviderId } from "../stores/FileSystemStore";
import { AppStore } from "../stores/AppStore";
import { Dialog } from "../components/Dialog";
import classNames from "classnames";

interface IProps {
  show: boolean;
  currentStorage: ProviderId | undefined;
  onChangeStorage?: (newStorage: ProviderId) => void;
  onDismiss?: () => void;
}

export const SelectStorageDialog = observer(function SelectStorageDialog({
  show,
  currentStorage,
  onChangeStorage,
  onDismiss,
}: IProps) {
  const availableStorages = Array.from(AppStore.fileSystem.providers.entries());

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onDismiss?.();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onStorageButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!e.currentTarget.dataset["storageId"]) return;
    const storageId = e.currentTarget.dataset["storageId"];

    onChangeStorage?.(storageId);
  }

  if (!show) return null;

  return (
    <Dialog onClickBackdrop={onDismiss} onKeyDown={onKeyDown}>
      <ul>
        {availableStorages.map(([storageId, provider]) => (
          <li key={storageId}>
            <button
              data-storage-id={storageId}
              data-focus={currentStorage === storageId ? true : undefined}
              className={classNames({
                selected: currentStorage === storageId,
              })}
              onClick={onStorageButtonClick}
            >
              {provider.name}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
});
