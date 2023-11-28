import React from "react";
import { observer } from "mobx-react-lite";
import { ProviderId } from "../stores/FileSystemStore";
import { AppStore } from "../stores/AppStore";
import { Dialog } from "../components/Dialog";
import classNames from "classnames";

import classes from "./SelectStorageDialog.module.css";

interface IProps {
  className?: string;
  show: boolean;
  label?: React.ReactElement | string;
  currentStorage: ProviderId | undefined;
  onChangeStorage?: (newStorage: ProviderId) => void;
  onDismiss?: () => void;
}

export const SelectStorageDialog = observer(function SelectStorageDialog({
  className,
  show,
  label,
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
    <Dialog
      className={`${classes.SelectStorageDialog} bg-files ${className ?? ""}`}
      onClickBackdrop={onDismiss}
      onKeyDown={onKeyDown}
      top
    >
      {label ? <p>{label}</p> : null}
      <ul className={classes.StorageList}>
        {availableStorages.map(([storageId, provider]) => (
          <li key={storageId}>
            <button
              data-storage-id={storageId}
              data-focus={currentStorage === storageId ? true : undefined}
              className={classNames("btn", {
                selected: currentStorage === storageId,
              })}
              onClick={onStorageButtonClick}
            >
              {provider.name}:
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
});
