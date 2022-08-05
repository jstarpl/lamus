import "./BreadcrumbCrumb.css";

interface IProps {
  onClick?: React.MouseEventHandler;
}

export function BreadcrumbCrumb({
  children,
  onClick,
}: React.PropsWithChildren<IProps>) {
  return (
    <button className="BreadcrumbBar__Crumb" onClick={onClick}>
      {children}
    </button>
  );
}
