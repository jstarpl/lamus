import React, { useContext, useId } from "react";
import classNames from "classnames";
import { SelectedContext, SelectedState } from "./ListViewList";

interface IProps {
  children?: React.ReactNode;
  value?: string;
}

export const ListViewItem = function ListViewItem({
  value,
  children,
}: IProps): JSX.Element {
  const id = useId();
  const selected = useContext(SelectedContext);
  const itemValue = value || id;
  const item = (
    <li
      key={itemValue}
      className={classNames("list-view-item", {
        selected: !!selected,
        "selected--first": selected === SelectedState.First,
        "selected--last": selected === SelectedState.Last,
        "selected--only": selected === SelectedState.Only,
        "selected--middle": selected === SelectedState.Middle,
      })}
      role="option"
      aria-selected={!!selected}
      data-value={itemValue}
      tabIndex={-1}
    >
      {children}
    </li>
  );

  return item;
};
