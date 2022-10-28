import React from "react";
import { Dialog } from "../../components/Dialog";
import { IDialogChoice } from "../useModalDialog";

export function ModalDialog({
  children,
  choices,
  onUserChoice,
}: React.PropsWithChildren<{
  choices: IDialogChoice<string>[];
  onUserChoice?: (result: string) => void;
}>) {
  function onButton(e: React.MouseEvent<HTMLButtonElement>) {
    console.log(e);
    if (!onUserChoice) return;
    if (!(e.target instanceof HTMLButtonElement)) return;
    if (!e.target.dataset["value"]) return;
    onUserChoice(e.target.dataset["value"]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    console.log(e, e.target);
  }

  function onKeyUp(e: React.KeyboardEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    console.log(e, e.target);
  }

  let renderChildren = children;
  if (typeof renderChildren === "string") {
    renderChildren = (
      <>
        {renderChildren.split(/\n+/).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </>
    );
  }

  return (
    <Dialog onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      {renderChildren}
      <div className="buttons">
        {choices.map((choice, index) => (
          <button
            key={`${choice.value}_${index}`}
            tabIndex={choice.default ? 1 : 2}
            data-accept={choice.default}
            data-focus={choice.default}
            data-own-focus
            type={choice.default ? "submit" : "button"}
            onClick={onButton}
            data-value={choice.value}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
