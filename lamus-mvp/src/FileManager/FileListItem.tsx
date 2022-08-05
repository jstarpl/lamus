import React from "react";
import prettyBytes from "pretty-bytes";
import { DateTime } from "luxon";
import "./FileListItem.css";
import { IFileEntryEx } from "./FileList";

const UP_DIR = "UP-DIR";
const SUB_DIR = "SUB-DIR";

interface IProps {
  file: IFileEntryEx;
}

export function FileListItem({ file }: IProps) {
  return (
    <div className="FileListItem">
      <div className="FileListItem__icon">{file.dir && "/"}</div>
      <div className="FileListItem__fileName">{file.fileName}</div>
      <div className="FileListItem__size">
        {file.dir
          ? file.parentDir
            ? UP_DIR
            : SUB_DIR
          : prettyBytes(file.size)}
      </div>
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
