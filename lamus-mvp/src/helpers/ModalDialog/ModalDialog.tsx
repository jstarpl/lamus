import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog } from "../../components/Dialog";
import { COMBO_SHORTHAND, parseCombo } from "../combos";
import { DialogButtonRole, IDialogChoice } from "../useModalDialog";

export function ModalDialog({
  className,
  children,
  choices,
  onUserChoice,
}: React.PropsWithChildren<{
  className?: string;
  choices: IDialogChoice<string>[];
  onUserChoice?: (result: string) => void;
}>) {
  function onButton(e: React.MouseEvent<HTMLButtonElement>) {
    if (!onUserChoice) return;
    if (!(e.target instanceof HTMLButtonElement)) return;
    if (!e.target.dataset["value"]) return;
    onUserChoice(e.target.dataset["value"]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (
      e.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA"].includes(e.target.nodeName)
    )
      return;

    let key = e.key;
    if (key.length === 1) {
      key = key.toUpperCase();
    }

    let found = false;

    const allComboButtons = document.querySelectorAll(
      "dialog[open] .buttons > button[data-combo]"
    ) as NodeListOf<HTMLButtonElement>;
    allComboButtons.forEach((button) => {
      if (!button.dataset["combo"]) return;
      const combo = JSON.parse(button.dataset["combo"]);
      const { lastKey, hasAlt, hasCtrl, hasShift, hasMeta } = parseCombo(combo);

      if (
        key === lastKey &&
        e.ctrlKey === hasCtrl &&
        e.altKey === hasAlt &&
        e.shiftKey === hasShift &&
        e.metaKey === hasMeta
      ) {
        button.focus();
        found = true;
      }
    });

    e.stopPropagation();

    if (found && key !== "Enter") {
      e.preventDefault();
    }
  }

  const renderMessage = useMemo(() => {
    if (typeof children !== "string") return children;
    return (
      <ReactMarkdown skipHtml transformLinkUri={transformLinkUri}>
        {children}
      </ReactMarkdown>
    );
  }, [children]);

  const renderButtons = choices.map((choice, index) => {
    const lastKey = choice.combo?.[choice.combo.length - 1];

    const displayLastKey = (lastKey && COMBO_SHORTHAND[lastKey]) ?? lastKey;

    return (
      <button
        key={`${choice.value}_${index}`}
        className={
          choice.role === DialogButtonRole.REJECT ? "reject" : undefined
        }
        tabIndex={choice.default ? 1 : 2}
        data-accept={choice.default}
        data-focus={choice.default}
        type={choice.default ? "submit" : "button"}
        onClick={onButton}
        data-value={choice.value}
        data-combo={choice.combo ? JSON.stringify(choice.combo) : undefined}
      >
        {displayLastKey && (
          <span className="DialogButtonHotkey">{displayLastKey}</span>
        )}
        {choice.label}
      </button>
    );
  });

  return (
    <Dialog className={className} onKeyDown={onKeyDown}>
      {renderMessage}
      <div className="buttons">{renderButtons}</div>
    </Dialog>
  );
}

function transformLinkUri(
  href: string,
  children: unknown,
  title: string | null
): string {
  return "#";
}
