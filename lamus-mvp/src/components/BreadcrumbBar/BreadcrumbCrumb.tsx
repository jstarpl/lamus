interface IProps {}

export function BreadcrumbCrumb({ children }: React.PropsWithChildren<IProps>) {
  return <div className="BreadcrumbBar__Crumb">{children}</div>;
}
