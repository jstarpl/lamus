import React from "react";
import { observer } from "mobx-react-lite";
import classes from "./MkDirDialog.module.css";
import { ModalDialog } from "../helpers/ModalDialog/ModalDialog";
import { DialogButtonResult, DialogButtons } from "../helpers/useModalDialog";

interface IProps {
  className?: string;
  show: boolean;
  label?: React.ReactElement | string;
  placeholder?: string;
  onDismiss?: () => void;
}

export const MkDirDialog = observer(function SelectStorageDialog({
  className,
  show,
  label,
  placeholder,
  onDismiss,
}: IProps) {
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onDismiss?.();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onUserChoice(e: string) {
    if (e === DialogButtonResult.CANCEL) onDismiss?.();
    onDismiss?.();
  }

  if (!show) return null;

  return (
    <ModalDialog
      className={`${classes.MkDirDialog} bg-files ${className ?? ""}`}
      choices={DialogButtons.CANCEL_OK}
      onUserChoice={onUserChoice}
    >
      <h1>{label}</h1>
      <p>Enter directory name:</p>
      <p>
        <input
          className="form-control"
          type="text"
          placeholder={placeholder}
          data-focus="true"
        />
      </p>
    </ModalDialog>
  );
});
