import "./BreadcrumbCrumb.css";

interface IProps {}

export function BreadcrumbCrumb({ children }: React.PropsWithChildren<IProps>) {
  return <button className="BreadcrumbBar__Crumb">{children}</button>;
}
