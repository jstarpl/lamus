import React, { useContext, useId } from "react";
import classNames from "classnames";
import { SelectedContext, SelectedState } from "./ListViewList";

type IProps = {
  value?: string;
} & Omit<
  React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>,
  "aria-selected" | "tabIndex" | "key"
>;

export const ListViewItem = React.memo(function ListViewItem({
  value,
  children,
  className,
  ...props
}: IProps): JSX.Element {
  const id = useId();
  const selected = useContext(SelectedContext);
  const itemValue = value || id;
  const item = (
    <li
      key={itemValue}
      className={classNames("list-view-item", className, {
        selected: !!selected,
        "selected--first": selected === SelectedState.First,
        "selected--last": selected === SelectedState.Last,
        "selected--only": selected === SelectedState.Only,
        "selected--middle": selected === SelectedState.Middle,
      })}
      role="option"
      data-own-cursor-navigation
      data-own-focus
      aria-selected={!!selected}
      data-value={itemValue}
      tabIndex={-1}
      {...props}
    >
      {children}
    </li>
  );

  return item;
});
