import React, { useMemo } from "react";
import prettyBytes from "pretty-bytes";
import { DateTime } from "luxon";
import "./FileListItem.css";
import { IFileEntryEx } from "./FileList";
import classNames from "classnames";
import { FILE_PATH_SEPARATOR } from "../stores/fileSystem/IFileSystemProvider";

const UP_DIR = "UP-DIR";
const SUB_DIR = "SUB-DIR";

interface IProps {
  file: IFileEntryEx;
  disabled?: boolean;
}

export function FileListItem({ file, disabled }: IProps) {
  const listItemSizeLabel = useMemo(() => {
    if (file.dir) {
      return file.parentDir ? UP_DIR : SUB_DIR;
    } else if (!file.virtual) {
      return prettyBytes(file.size);
    }
  }, [file.dir, file.parentDir, file.size, file.virtual]);

  const listItemModifiedLabel = useMemo(() => {
    return (
      file.modified &&
      DateTime.fromJSDate(file.modified).toLocaleString({
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [file.modified]);

  return (
    <div
      className={classNames("FileListItem", {
        "FileListItem--disabled": disabled,
      })}
    >
      <div className="FileListItem__icon">
        {file.dir && FILE_PATH_SEPARATOR}
      </div>
      <div className="FileListItem__fileName">{file.fileName}</div>
      <div className="FileListItem__size">{listItemSizeLabel}</div>
      <div className="FileListItem__modified">{listItemModifiedLabel}</div>
    </div>
  );
}
