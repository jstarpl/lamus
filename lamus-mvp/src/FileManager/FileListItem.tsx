import React from "react";
import prettyBytes from "pretty-bytes";
import { DateTime } from "luxon";
import "./FileListItem.css";
import { IFileEntryEx } from "./FileList";
import classNames from "classnames";

const UP_DIR = "UP-DIR";
const SUB_DIR = "SUB-DIR";

interface IProps {
  file: IFileEntryEx;
  disabled?: boolean;
}

export function FileListItem({ file, disabled }: IProps) {
  let listItemSizeLabel = "";
  if (file.dir) {
    listItemSizeLabel = file.parentDir ? UP_DIR : SUB_DIR;
  } else if (!file.virtual) {
    listItemSizeLabel = prettyBytes(file.size);
  }

  return (
    <div
      className={classNames("FileListItem", {
        "FileListItem--disabled": disabled,
      })}
    >
      <div className="FileListItem__icon">{file.dir && "/"}</div>
      <div className="FileListItem__fileName">{file.fileName}</div>
      <div className="FileListItem__size">{listItemSizeLabel}</div>
      <div className="FileListItem__modified">
        {file.modified &&
          DateTime.fromJSDate(file.modified).toLocaleString({
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
      </div>
    </div>
  );
}
