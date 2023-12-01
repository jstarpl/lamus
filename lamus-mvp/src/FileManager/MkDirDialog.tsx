import React, { useCallback, useEffect, useState } from "react";
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
  onAccept?: (name: string) => void;
}

export const MkDirDialog = observer(function SelectStorageDialog({
  className,
  show,
  label,
  placeholder,
  onDismiss,
  onAccept,
}: IProps) {
  const [name, setName] = useState("");

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onDismiss?.();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onUserChoice(e: string) {
    if (e !== DialogButtonResult.OK) onDismiss?.();
    if (!isValid()) return;
    onAccept?.(name);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    onAccept?.(name);
  }

  function isValid(): boolean {
    if (name.length === 0) return false;

    return true;
  }

  const reset = useCallback(() => {
    setName("");
  }, []);

  useEffect(() => {
    if (show) return;

    reset();
  }, [show]);

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
        <form onSubmit={onSubmit} onKeyDown={onKeyDown}>
          <input
            className="form-control"
            type="text"
            placeholder={placeholder}
            data-focus="true"
            enterKeyHint="done"
            minLength={1}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </form>
      </p>
    </ModalDialog>
  );
});
